import { GoogleGenAI } from "@google/genai";
import { db } from "../firebase";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";

interface VertexConfig {
  projectId: string;
  region: string;
  modelId?: string;
  credentialsJson?: string;
}

class AIService {
  private client: any = null;
  private config: VertexConfig | null = null;
  private isInitialized = false;
  private imgenModel = "imagen-3.0-generate-001";
  private imgenFastModel = "imagen-3.0-fast-generate-001";
  private flashImageModel = "gemini-1.5-flash-002"; 
  private flash2ImageModel = "gemini-2.0-flash-exp";
  private proImageModel = "gemini-1.5-pro-002";

  private sharedAudioCtx: AudioContext | null = null;
  private pooledClientsCache: any[] | null = null;
  private lastPoolFetch = 0;

  private async initialize() {
    if (this.isInitialized) return;
    
    try {
      const configRef = doc(db, "settings", "vertex_config");
      const snap = await getDoc(configRef);
      
      if (snap.exists()) {
        this.config = snap.data() as VertexConfig;
        console.log("Auurio: Found Vertex AI configuration.");
      }
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("Auurio: GEMINI_API_KEY is missing.");
      }
      this.client = new GoogleGenAI({ apiKey: apiKey || '' });
    } catch (err) {
      console.warn("Auurio: Initialization error. Falling back.", err);
      this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    }
    
    this.isInitialized = true;
  }

  private getAudioCtx() {
    if (!this.sharedAudioCtx) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      if (Ctx) this.sharedAudioCtx = new Ctx();
    }
    return this.sharedAudioCtx;
  }

  private async callVertexProxy(prompt: string, modelId: string): Promise<string | null> {
    if (!this.config || !this.config.credentialsJson) return null;

    try {
      console.log(`Auurio: Routing via Vertex Proxy for model: ${modelId}`);
      const response = await fetch('/api/vertex/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.config.projectId,
          region: this.config.region,
          modelId: modelId || this.config.modelId || 'gemini-1.5-flash-002',
          credentials: this.config.credentialsJson,
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      // Vertex response structure
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (err: any) {
      console.error("Auurio: Vertex Proxy failed:", err.message);
      return null;
    }
  }

  public async generateText(prompt: string, modelOverride?: string, onProgress?: (status: string) => void): Promise<string> {
    await this.initialize();

      // ARCHITECTURAL RULE: Text generation MUST use Vertex/Primary key.
      // NEVER use the Legacy API Key Pool for these tasks.
      if (this.config && this.config.credentialsJson) {
      onProgress?.("Contacting Vertex AI high-speed engine...");
      const vertexText = await this.callVertexProxy(prompt, modelOverride || this.config.modelId || 'gemini-1.5-flash-002');
      if (vertexText) return vertexText;
      console.warn("Auurio: Vertex Proxy returned empty or failed. Falling back to Gemini API.");
    }

    const models = [
      modelOverride || "gemini-3-flash-preview",
      "gemini-3.1-flash-lite-preview",
      "gemini-2.0-flash",
      "gemini-1.5-flash-8b"
    ];

    let lastError: any = null;

    for (const modelName of models) {
      try {
        onProgress?.(`Trying engine ${modelName}...`);
        const response = await this.client.models.generateContent({
          model: modelName,
          contents: prompt
        });
        
        const text = response.text;
        if (text) {
          onProgress?.("Script received and processed.");
          return text;
        }
        
      } catch (err: any) {
        lastError = err;
        console.warn(`Auurio: Model ${modelName} reached quota or error:`, err.message);
        continue;
      }
    }

    throw new Error("Auurio AI Services are currently over capacity. Please try again in 5 minutes.", { cause: lastError });
  }
  
  private async getPooledClients(): Promise<{ id: string, key: string, client: any, priority: number }[]> {
    const now = Date.now();
    // Cache the pool for 15 seconds to be more reactive to quota changes
    if (this.pooledClientsCache && (now - this.lastPoolFetch < 15000)) {
      return this.pooledClientsCache;
    }

    try {
      const keysSnap = await getDocs(collection(db, 'api_keys'));
      
      const pool = keysSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(d => d.status === 'active' || !d.status) // Default to active if status missing
        .filter(d => !d.coolDownUntil || d.coolDownUntil < now) 
        .sort((a, b) => {
          if ((a.priority || 0) !== (b.priority || 0)) {
            return (a.priority || 0) - (b.priority || 0);
          }
          return (a.lastUsed || 0) - (b.lastUsed || 0);
        });

      const processedPool = pool.map(best => ({ 
        id: best.id, 
        key: best.key, 
        client: new GoogleGenAI({ apiKey: best.key }),
        priority: best.priority || 0
      }));

      // If everything is empty, fallback to primary if ready
      if (processedPool.length === 0 && Date.now() > this.primaryExhaustedUntil) {
        return []; 
      }

      this.pooledClientsCache = processedPool;
      this.lastPoolFetch = now;
      return processedPool;
    } catch (err) {
      console.warn("Auurio: Key pool fetch failed.", err);
      return this.pooledClientsCache || [];
    }
  }

  private async reportKeyStatus(id: string, status: 'success' | 'quota' | 'error', errorMessage?: string) {
    try {
      const keyRef = doc(db, 'api_keys', id);
      const updates: any = { lastUsed: Date.now() };
      
      if (status === 'success') {
        updates.priority = 0; // Working
        updates.status = 'active';
        updates.lastError = null;
      } else if (status === 'quota' || (errorMessage && (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('exhausted')))) {
        updates.priority = 1; // Quota Full
        updates.coolDownUntil = Date.now() + (5 * 60 * 1000); // reduced to 5 min cooldown for quota
        updates.lastError = 'Quota Exceeded (429)';
      } else if (status === 'error') {
        // If it's an API key invalid error, mark as Priority 2
        const isInvalid = errorMessage?.toLowerCase().includes('api key') || errorMessage?.toLowerCase().includes('invalid');
        updates.priority = isInvalid ? 2 : 0; 
        updates.status = isInvalid ? 'error' : 'active';
        updates.lastError = errorMessage || 'Unknown Error';
        if (!isInvalid) {
          updates.coolDownUntil = Date.now() + (60 * 1000); // 1 min cooldown for transient errors
        }
      }
      
      await setDoc(keyRef, updates, { merge: true });
    } catch (err) {
      console.warn(`Auurio: Failed to update status for key ${id}`);
    }
  }

  public pcmToWav(pcmData: string | Uint8Array, sampleRate = 24000): string {
    try {
      let bytes: Uint8Array;
      
      if (typeof pcmData === 'string') {
        const binary = atob(pcmData);
        const len = binary.length;
        bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
      } else {
        bytes = pcmData;
      }
      
      const len = bytes.length;
      const wavHeader = new ArrayBuffer(44);
      const view = new DataView(wavHeader);
      
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + len, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM - integer
      view.setUint16(22, 1, true); // Mono
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true); // Byte rate
      view.setUint16(32, 2, true); // Block align
      view.setUint16(34, 16, true); // Bits per sample
      writeString(36, 'data');
      view.setUint32(40, len, true);
      
      const blob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      return url;
    } catch (err) {
      console.error("Auurio: Audio buffer conversion failed", err);
      return "";
    }
  }

  public async generateAudio(
    text: string, 
    voiceId: string, 
    language: string, 
    options: { onProgress?: (percent: number) => void, pitch?: number, speed?: number } = {}
  ): Promise<{ url: string, pcm?: string }> {
    await this.initialize();
    
    // Optimized chunking: 800 chars is the "sweet spot" for Gemini 3.1 TTS stability
    const chunks = this.splitTextIntoChunks(text, 800); 
    
    console.log(`Auurio: Narration started. Total Chars: ${text.length}, Chunks: ${chunks.length}`);
    console.log(`Auurio: Target Model: Gemini 3 Flash Preview (via Rotation Pool)`);

    let completedSegments = 0;
    const reportProgress = () => {
      completedSegments++;
      if (options.onProgress) {
        options.onProgress(Math.round((completedSegments / chunks.length) * 100));
      }
    };

    // Concurrency control for parallel audio generation to prevent API timeouts
    const results: any[] = [];
    const concurrencyLimit = 2; // More conservative for combined pool/primary usage
    for (let i = 0; i < chunks.length; i += concurrencyLimit) {
      const batch = chunks.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(batch.map(async (chunk, batchIdx) => {
        const result = await this.generateSingleAudioChunk(chunk, voiceId, language, i + batchIdx + 1, chunks.length);
        reportProgress();
        return result;
      }));
      results.push(...batchResults);
      
      // Delay between batches to allow API quota to breathe
      if (i + concurrencyLimit < chunks.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Merge all segments using AudioContext for seamless transition
    try {
      const ctx = this.getAudioCtx();
      if (!ctx) throw new Error("AudioContext not supported");
      console.log("Auurio: Synthesis results received, beginning audio assembly...");
      
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(e => console.warn("Auurio: AudioContext resume failed", e));
      }

      const buffers: (AudioBuffer | null)[] = [];
      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (!res.pcm) {
          buffers.push(null);
          continue;
        }
        
        try {
          const binary = atob(res.pcm);
          const bytes = new Uint8Array(binary.length);
          for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
          
          let decoded: AudioBuffer | null = null;

          // Manual PCM decoding for L16
          if (res.mimeType?.includes('pcm') || res.mimeType?.includes('L16')) {
            try {
              const floatData = new Float32Array(bytes.length / 2);
              const view = new DataView(bytes.buffer);
              for (let k = 0; k < floatData.length; k++) {
                floatData[k] = view.getInt16(k * 2, true) / 32768.0;
              }
              decoded = ctx.createBuffer(1, floatData.length, 24000);
              decoded.getChannelData(0).set(floatData);
            } catch (e) {
              console.warn(`Auurio: Manual decode failed for segment ${i+1}`, e);
            }
          }

          if (!decoded) {
            // Attempt standard decoding with timeout
            const decodePromise = ctx.decodeAudioData(bytes.buffer.slice(0));
            const timeoutPromise = new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000));
            decoded = await Promise.race([decodePromise, timeoutPromise]) as AudioBuffer;
          }
          
          buffers.push(decoded);
        } catch (e) {
          console.warn(`Auurio: Segment ${i+1} decoding failed`, e);
          buffers.push(null);
        }
      }

      const validBuffers = buffers.filter(b => b !== null) as AudioBuffer[];
      if (validBuffers.length === 0) throw new Error("Could not decode any audio segments.");

      // Use the sample rate of the first valid buffer
      const sampleRate = validBuffers[0].sampleRate;
      const totalSamples = validBuffers.reduce((acc, b) => acc + b.length, 0);
      const interleaved = ctx.createBuffer(1, totalSamples, sampleRate);
      let offset = 0;
      for (const b of validBuffers) {
        interleaved.getChannelData(0).set(b.getChannelData(0), offset);
        offset += b.length;
      }

      const wavBlob = this.audioBufferToWav(interleaved);
      const fullWavUrl = URL.createObjectURL(wavBlob);
      
      return { url: fullWavUrl, pcm: "MERGED_AUDIO_IN_URL" };
    } catch (err) {
      console.error("Auurio: High-fidelity merging failed, falling back to simple merge", err);
      // Fallback to simple pcm merge if AudioContext fails (e.g. in some environments)
      const pcmChunks: Uint8Array[] = [];
      for (const res of results) {
        if (res.pcm) {
          const binary = atob(res.pcm);
          const bytes = new Uint8Array(binary.length);
          for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
          pcmChunks.push(bytes);
        }
      }
      if (pcmChunks.length === 0) throw new Error("No valid audio data retrieved.", { cause: err });
      
      const totalLength = pcmChunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const mergedPcm = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of pcmChunks) {
        mergedPcm.set(chunk, offset);
        offset += chunk.length;
      }
      const fullWavUrl = this.pcmToWav(mergedPcm, 24000);
      return { url: fullWavUrl, pcm: this.uint8ArrayToBase64(mergedPcm) };
    }
  }

  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length * 2;
    const view = new DataView(new ArrayBuffer(44 + length));
    
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, length, true);
    
    const channel = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < channel.length; i++) {
      const sample = Math.max(-1, Math.min(1, channel[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([view], { type: 'audio/wav' });
  }

  private splitTextIntoChunks(text: string, maxLength: number): string[] {
    if (!text) return [];
    
    // Split by sentences or line breaks
    const segments = text.split(/(?<=[.!?])\s+|(?<=\n)\n*/);
    const chunks: string[] = [];
    let currentChunk = "";

    for (const segment of segments) {
      // If a single segment is too long, we must break it by words
      if (segment.length > maxLength) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = "";
        }
        
        const words = segment.split(/\s+/);
        let wordChunk = "";
        for (const word of words) {
          if ((wordChunk + word).length > maxLength && wordChunk.length > 0) {
            chunks.push(wordChunk.trim());
            wordChunk = word;
          } else {
            wordChunk += (wordChunk.length > 0 ? " " : "") + word;
          }
        }
        if (wordChunk.trim().length > 0) {
          currentChunk = wordChunk.trim();
        }
        continue;
      }

      if ((currentChunk + segment).length > maxLength && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = segment;
      } else {
        currentChunk += (currentChunk.length > 0 ? " " : "") + segment;
      }
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(c => c.length > 0);
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    const chunkSize = 8192;
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as any);
    }
    return btoa(binary);
  }

  private async processAudioResponse(audioData: string | Uint8Array, mimeType: string, id: string | null, current: number, total: number, modelId: string, isPooled: boolean): Promise<{ url: string, pcm: string, mimeType: string }> {
    if (isPooled && id) {
      this.reportKeyStatus(id, 'success').catch(() => {});
    }
    
    console.log(`Auurio: Segment ${current}/${total} SUCCESS via ${modelId} (${isPooled ? 'Pooled' : 'Primary'}) | Type: ${mimeType}`);
    
    let finalPcm: string;
    let wavUrl: string;
    if (mimeType.includes('pcm') || mimeType.includes('L16')) {
      wavUrl = this.pcmToWav(audioData, 24000);
      finalPcm = typeof audioData === 'string' ? audioData : this.uint8ArrayToBase64(audioData);
    } else {
      let bytes: Uint8Array;

      if (typeof audioData === 'string') {
        finalPcm = audioData;
        const binary = atob(audioData);
        bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      } else {
        bytes = audioData;
        finalPcm = this.uint8ArrayToBase64(bytes);
      }
      
      const blob = new Blob([bytes], { type: mimeType });
      wavUrl = URL.createObjectURL(blob);
    }
    
    return { url: wavUrl, pcm: finalPcm, mimeType };
  }

  private primaryExhaustedUntil = 0;

  private async generateSingleAudioChunk(text: string, voiceId: string, language: string, current: number, total: number): Promise<{ url: string, pcm: string, mimeType: string }> {
    let attempts = 0;
    const maxAttempts = 2; 
    let lastError: any = null;

    while (attempts < maxAttempts) {
      try {
        const pooledClients = await this.getPooledClients();
        const clientsToTry: { id: string | null, client: any, isPooled: boolean }[] = [];
        
        // Try pooled keys first
        pooledClients.forEach(p => clientsToTry.push({ id: p.id, client: p.client, isPooled: true }));
        
        // Add primary key if not exhausted
        if (Date.now() > this.primaryExhaustedUntil) {
          clientsToTry.push({ id: null, client: this.client, isPooled: false });
        }

        if (clientsToTry.length === 0) {
          throw new Error("No active API keys available.");
        }

        const audioModels = [
          "gemini-3.1-flash-tts-preview",
          "gemini-3.0-flash-preview",
          "gemini-2.0-flash",
          "gemini-1.5-flash-002",
          "gemini-1.5-flash"
        ];
        
        for (const entry of clientsToTry) {
          let clientHitQuota = false;
          
          for (const modelId of audioModels) {
            try {
              const voiceNameMap: Record<string, string> = {
                'charon': 'Charon', 'zephyr': 'Aoede', 'fenrir': 'Fenrir',
                'kore': 'Kore', 'puck': 'Puck', 'aoede': 'Aoede'
              };
              const voiceName = voiceNameMap[voiceId] || 'Puck';
              
              // Enhanced prompt for realistic multi-language narration
              const narrationPrompt = `Narrate this text naturally in ${language} with expressive tone and proper pacing. Text: ${text}`;
              
              console.log(`Auurio: Narrating Segment ${current}/${total} using key ${entry.id || 'PRIMARY'} on ${modelId}...`);
              
              const timeoutMs = 60000; // Increased to 60s for high-quality audio generation
              const genPromise = entry.client.models.generateContent({
                model: modelId,
                contents: [{ parts: [{ text: narrationPrompt }] }],
                config: {
                  responseModalities: ["AUDIO"],
                  speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
                }
              });

              const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error("Timeout")), timeoutMs)
              );

              const response = await Promise.race([genPromise, timeoutPromise]);
              
              // Robust response parsing
              const parts = response.candidates?.[0]?.content?.parts || [];
              const audioPart = parts.find((p: any) => p.inlineData?.data || (p.mimeType && p.mimeType.includes('audio')));
              const data = audioPart?.inlineData?.data || response.data;
              
              if (data) {
                const mimeType = audioPart?.inlineData?.mimeType || audioPart?.mimeType || 'audio/pcm';
                return await this.processAudioResponse(data, mimeType, entry.id, current, total, modelId, entry.isPooled);
              }
              
              console.warn(`Auurio: ${modelId} gave null audio. Response was:`, JSON.stringify(response).substring(0, 200));
            } catch (err: any) {
              const errMsg = (err.message || "").toLowerCase();
              
              if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('exhausted')) {
                console.warn(`Auurio: Key ${entry.id || 'primary'} Quota on ${modelId}. Rotating...`);
                if (entry.isPooled && entry.id) {
                  await this.reportKeyStatus(entry.id, 'quota', err.message);
                  this.pooledClientsCache = null;
                } else if (!entry.isPooled) {
                  this.primaryExhaustedUntil = Date.now() + (2 * 60 * 1000); 
                }
                clientHitQuota = true;
                break; 
              }

              if (errMsg.includes('not support') || errMsg.includes('modality') || errMsg.includes('invalid') || errMsg.includes('400')) {
                continue; // Try next model for this key
              }
              
              console.error(`Auurio: Segment ${current} Error via ${modelId}:`, err.message);
            }
          }
          if (clientHitQuota) continue; // Try next key
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          const delay = 1000 * attempts;
          console.log(`Auurio: All keys failed for segment ${current}. Retry ${attempts}/${maxAttempts} in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
        }
      } catch (err: any) {
        lastError = err;
        attempts++;
        await new Promise(r => setTimeout(r, 1000 * attempts));
      }
    }
    
    throw lastError || new Error(`Narration engine failure on segment ${current}. Please try another voice.`);
  }

  private cleanPromptForSafety(prompt: string): string {
    const riskyWords: Record<string, string> = {
      'violence': 'action',
      'blood': 'crimson liquid',
      'kill': 'defeat',
      'attack': 'engage',
      'weapon': 'equipment',
      'gun': 'prop',
      'death': 'fate',
      'dead': 'fallen',
      'scary': 'intense',
      'war': 'conflict',
      'horror': 'mystery',
      'murder': 'incident',
      'steal': 'acquire',
      'fire': 'blaze',
      'explosion': 'burst of light',
      'shoot': 'capture',
      'fight': 'clash'
    };

    let cleaned = prompt.toLowerCase();
    // Aggressive pattern matching for whole words
    Object.entries(riskyWords).forEach(([risky, safe]) => {
      const regex = new RegExp(`\\b${risky}\\b`, 'gi');
      cleaned = cleaned.replace(regex, safe);
    });

    // Remove specific potentially blocking adjectives
    cleaned = cleaned.replace(/\b(nude|sex|explicit|nsfw|gore|mangled|decapitated|bloody)\b/gi, 'cinematic');
    
    return cleaned.substring(0, 500);
  }

  public async generateImage(prompt: string, options: { width?: number; height?: number; useFlash?: boolean; negativePrompt?: string; style?: string } = {}): Promise<string> {
    await this.initialize();
    const width = options.width || 1024;
    const height = options.height || 1024;
    
    if (!prompt || prompt.length < 5) {
      prompt = "Cinematic atmospheric professional photography, masterpiece lighting";
    }

    // Proactive Safety Pass
    const sanitizedPrompt = this.cleanPromptForSafety(prompt);
    
    const cinematicKeywords = "Professional cinematic photography, masterpiece, high-end 8k resolution, detailed texture, atmospheric lighting, epic composition, production still.";
    
    let styleModifiers = "";
    if (options.style) {
      styleModifiers = `STYLE: ${options.style}. THEME: ${options.style}. `;
    }

    const framePrompt = `${styleModifiers} ${cinematicKeywords} ${sanitizedPrompt}.`;
    const negativePrompt = options.negativePrompt || "text, watermark, logo, blurry, low quality, distorted face, bad anatomy";

    const models = [
      "gemini-2.0-flash",             
      "gemini-2.0-flash-exp",
      "imagen-3.0-fast-generate-001", 
      "imagen-3.0-generate-001",
      "gemini-1.5-flash-002",         
    ];

    const attempt = async (modelIndex: number, currentPrompt: string): Promise<string> => {
      if (modelIndex >= models.length) {
        console.warn("Auurio: All primary high-end engines exhausted. Using high-speed CDN fallback.");
        return this.generateImageUrl(currentPrompt, width, height);
      }

      const currentModel = models[modelIndex];
      const activeClient = this.client;
      
      try {
        console.log(`Auurio: Rendering Scene -> ${currentModel} (Engine ${modelIndex + 1}/${models.length})`);
        
        // Timeout handling: increased for better stability
        const timeoutMs = currentModel.includes("imagen") ? 55000 : 40000;
        
        const genPromise = (async () => {
          if (currentModel.includes("imagen")) {
            // Check if generateImages method exists on this client version
            if (!activeClient?.models?.generateImages) {
                console.warn(`Auurio: ${currentModel} requires specific SDK capability for Image generation.`);
                throw new Error("UNSUPPORTED_OR_FORBIDDEN");
            }

            try {
              const response = await activeClient.models.generateImages({
                model: currentModel,
                prompt: currentPrompt,
                config: {
                  numberOfImages: 1,
                  aspectRatio: width === height ? "1:1" : (width > height ? "16:9" : "9:16"),
                  negativePrompt: negativePrompt
                }
              });
              
              const bytes = response.generatedImages?.[0]?.image?.imageBytes;
              if (bytes) {
                console.log(`Auurio: Visual SUCCESS -> ${currentModel}`);
                const base64 = typeof bytes === 'string' ? bytes : this.uint8ArrayToBase64(bytes as Uint8Array);
                return `data:image/png;base64,${base64}`;
              }
            } catch (err: any) {
              console.warn(`Auurio: ${currentModel} Imagen error: ${err.message}`);
              throw err;
            }
          } else {
            // Gemini multimodal generation (only available in 2.0+)
            try {
              const response = await activeClient.models.generateContent({
                model: currentModel,
                contents: [{ role: 'user', parts: [{ text: `Generate a photorealistic high-resolution cinematic masterpiece matching exactly this description: ${currentPrompt}` }] }],
                config: {
                  responseModalities: ["IMAGE"],
                }
              });

              const parts = response.candidates?.[0]?.content?.parts;
              const imagePart = parts?.find((p: any) => p.inlineData);
              
              if (imagePart?.inlineData?.data) {
                console.log(`Auurio: Visual SUCCESS -> ${currentModel} (Multimodal)`);
                return `data:${imagePart.inlineData.mimeType || "image/png"};base64,${imagePart.inlineData.data}`;
              } else {
                // Check if it returned text instead (safety filter or refusal)
                const textPart = parts?.find((p: any) => p.text);
                if (textPart?.text) {
                  console.warn(`Auurio: ${currentModel} returned text instead of image: ${textPart.text.substring(0, 50)}...`);
                  if (textPart.text.toLowerCase().includes("safety") || textPart.text.toLowerCase().includes("policy")) {
                    throw new Error("SAFETY_BLOCK");
                  }
                }
                console.warn(`Auurio: ${currentModel} returned no image bytes.`);
                throw new Error("EMPTY_PAYLOAD");
              }
            } catch (innerErr: any) {
              const msg = innerErr.message?.toLowerCase() || "";
              if (msg.includes('400') || msg.includes('modality') || msg.includes('argument') || msg.includes('403') || msg.includes('404')) {
                 console.warn(`Auurio: ${currentModel} does not support image output in this configuration.`);
                 throw new Error("UNSUPPORTED_OR_FORBIDDEN", { cause: innerErr });
              }
              if (msg.includes('safety') || msg.includes('blocked')) {
                throw new Error("SAFETY_BLOCK", { cause: innerErr });
              }
              throw innerErr;
            }
          }
          
          throw new Error("EMPTY_PAYLOAD");
        })();

        // Race with timeout
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), timeoutMs)
        );

        return await Promise.race([genPromise, timeoutPromise]);

      } catch (err: any) {
        const errMsg = err.message || "Unknown error";
        console.warn(`Auurio: Visual engine ${currentModel} error: ${errMsg}`);
        
        // Handle Safety Triggers
        if (errMsg.toLowerCase().includes("safety") || errMsg.toLowerCase().includes("blocked")) {
           console.warn("Auurio: Content filter triggered. Generalizing prompt for next attempt...");
           const generalPrompt = "A cinematic atmospheric professional masterpiece shot with dramatic lighting, artistic rendering, high detail";
           return attempt(modelIndex + 1, generalPrompt);
        }

        // Fast rotate on fatal errors
        return attempt(modelIndex + 1, currentPrompt);
      }

    };

    try {
      return await attempt(0, framePrompt);
    } catch (err: any) {
      console.warn("Auurio: All primary AI image engines failed eventually. Using CDN fallback.", err.message);
      return this.generateImageUrl(framePrompt, width, height);
    }

  }

  public generateImageUrl(prompt: string, width = 1024, height = 1024) {
    const seed = Math.floor(Math.random() * 1000000);
    
    // Cap dimensions for CDN stability
    const cappedWidth = Math.min(width, 1280);
    const cappedHeight = Math.min(height, 1280);

    const cleanPrompt = prompt.replace(/[^a-zA-Z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 150);
    
    const safePrompt = encodeURIComponent(cleanPrompt || "Cinematic atmosphere lighting");
    return `https://image.pollinations.ai/prompt/${safePrompt}?width=${cappedWidth}&height=${cappedHeight}&seed=${seed}&nologo=true&enhance=true&model=flux`;
  }

  public speak(text: string, language: string, options: { pitch?: number, speed?: number } = {}) {
    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    
    const pitch = options.pitch ?? 1.0;
    const speed = options.speed ?? 1.0;
    
    const utter = () => {
      const voices = synth.getVoices();
      const utterance = new SpeechSynthesisUtterance(text);
      
      const langMap: Record<string, string> = {
        'English': 'en-US',
        'Hindi': 'hi-IN',
        'Bangla': 'bn-IN'
      };
      const langCode = langMap[language] || 'en-US';
      
      const voice = voices.find(v => v.lang.includes(langCode) && !v.name.includes('Google')) 
                 || voices.find(v => v.lang.includes(langCode))
                 || voices[0];
                 
      if (voice) utterance.voice = voice;
      utterance.lang = langCode;
      utterance.rate = speed;
      utterance.pitch = pitch;
      synth.speak(utterance);
    };

    if (synth.getVoices().length === 0) {
      synth.onvoiceschanged = utter;
    } else {
      utter();
    }
  }

  public stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const aiService = new AIService();
