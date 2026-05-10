import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  Sparkles, 
  Loader2, 
  Mic, 
  Type,
  Languages,
  Clock,
  Volume2,
  Image as ImageIcon,
  Play,
  Download,
  ChevronRight,
  MonitorPlay,
  Smartphone,
  Upload,
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Plus,
  Layout,
  CheckCircle2
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { creditService, CREDIT_COSTS } from '../services/creditService';
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import ProductionPlayer from '../components/ProductionPlayer';
import VideoPlayer from '../components/VideoPlayer';
import { exportToVideo, ExportProgress } from '../lib/videoExporter';

interface Scene {
  id: string;
  partIndex: number; // For episodic tracking
  visualPrompt: string;
  narration: string;
  imageUrl: string;
  audioUrl?: string;
  audioDuration?: number;
  isHook?: boolean;
  isCliffhanger?: boolean;
  status: {
    story: 'pending' | 'processing' | 'done' | 'error';
    voice: 'pending' | 'processing' | 'done' | 'error';
    visual: 'pending' | 'processing' | 'done' | 'error';
  };
}

type Step = 'script' | 'editor' | 'voice' | 'visuals' | 'video';

const VOICES = {
  English: [
    { id: 'charon', name: 'Charon (Mature)', country: 'USA', style: 'Stable & Calm' },
    { id: 'zephyr', name: 'Zephyr (Warm)', country: 'USA', style: 'Friendly & Social' },
    { id: 'fenrir', name: 'Fenrir (Deep)', country: 'USA', style: 'Powerful & Strong' },
    { id: 'kore', name: 'Kore (Clear)', country: 'USA', style: 'Expressive & Emotional' },
    { id: 'puck', name: 'Puck (Energetic)', country: 'USA', style: 'Rhythmic & Fast' }
  ],
  Hindi: [
    { id: 'charon', name: 'Charon (शांत)', country: 'India', style: 'গম্ভীর ন্যারেশন' },
    { id: 'zephyr', name: 'Zephyr (मित्रवत)', country: 'India', style: 'উষ্ণ স্বর' },
    { id: 'fenrir', name: 'Fenrir (शक्तिशाली)', country: 'India', style: 'থ্রিলার এবং হরর' },
    { id: 'kore', name: 'Kore (स्पष्ट)', country: 'India', style: 'আবেগপ্রবণ' },
    { id: 'puck', name: 'Puck (उर्जस्ववी)', country: 'India', style: 'রিলে হাই এনার্জি' }
  ],
  Bangla: [
    { id: 'charon', name: 'Charon (গম্ভীর)', country: 'Bangladesh', style: 'শান্ত ও স্থিতিশীল' },
    { id: 'zephyr', name: 'Zephyr (উষ্ণ)', country: 'Bangladesh', style: 'বন্ধুসুলভ ও স্পষ্ট' },
    { id: 'fenrir', name: 'Fenrir (গভীর)', country: 'Bangladesh', style: 'শক্তিশালী ও থ্রিলার' },
    { id: 'kore', name: 'Kore (সুস্পষ্ট)', country: 'Bangladesh', style: 'আবেগপ্রবণ ও মিষ্টি' },
    { id: 'puck', name: 'Puck (প্রাণবন্ত)', country: 'Bangladesh', style: 'এনার্জিটিক ও রিদমিক' }
  ]
};

export default function ReelAura({ profile }: { profile: any }) {
  const [activeStep, setActiveStep] = useState<Step>('script');
  const [topic, setTopic] = useState('');
  const [length, setLength] = useState(1); // Minutes (1-10)
  const [isPartStory, setIsPartStory] = useState(false);
  const [numParts, setNumParts] = useState(3);
  const [partLength, setPartLength] = useState(1); // Minutes
  
  const [language, setLanguage] = useState<'English' | 'Hindi' | 'Bangla'>('English');
  const [voice, setVoice] = useState(VOICES.English[0].id);
  const [voiceTone, setVoiceTone] = useState(1.0);
  const [voiceSpeed, setVoiceSpeed] = useState(1.1); // Default 1.1 for Reels as suggested
  const [theme, setTheme] = useState<'Realistic' | 'Anime' | 'Abstract'>('Realistic');
  const [watermark, setWatermark] = useState({
    enabled: true,
    mode: 'text' as 'text' | 'logo',
    text: 'Auurio Shorts',
    logoUrl: '',
    opacity: 0.7,
    position: 'bottom-center' as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom-center' | 'center',
    size: 20
  });
  
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [fullScript, setFullScript] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [currentPreviewPart, setCurrentPreviewPart] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);

  const scenesRef = useRef<Scene[]>([]);
  useEffect(() => {
    scenesRef.current = scenes;
  }, [scenes]);

  const isProjectLoading = useRef(false);

  const saveProjectState = async (updates: any = {}) => {
    if (isProjectLoading.current) return;
    const params = new URLSearchParams(window.location.search);
    const pid = projectId || params.get('projectId');
    if (!pid) return;

    try {
      await updateDoc(doc(db, 'projects', pid), {
        scenes,
        audioUrl,
        fullScript,
        activeStep,
        progress,
        topic,
        language,
        voice,
        length,
        theme,
        isPartStory,
        numParts,
        partLength,
        videoUrl,
        currentPreviewPart,
        updatedAt: serverTimestamp(),
        ...updates
      });
    } catch (e) {
      console.error("Auto-save failed", e);
    }
  };

  useEffect(() => {
    if (!isProjectLoading.current && projectId && (scenes.length > 0 || activeStep !== 'script')) {
      saveProjectState();
    }
  }, [scenes, activeStep, fullScript, topic, voice, theme, isPartStory, numParts, partLength, audioUrl, videoUrl, currentPreviewPart]);
  
  useEffect(() => {
    return () => aiService.stopSpeaking();
  }, []);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  const performVideoExport = async (targetPartIndex?: number) => {
    const workingScenes = targetPartIndex 
      ? scenes.filter(s => s.partIndex === targetPartIndex)
      : scenes;

    if (workingScenes.length === 0) throw new Error("No scenes found for this part.");

    // Check if scenes have individual audio or we need to use a master chunk
    const firstAudioUrl = workingScenes[0].audioUrl;
    // If it's a part-based story, the scenes for a part share the same URL. 
    // We should treat it as a single audio export for that part to avoid multi-synth issues in the recorder.
    const effectiveAudioUrl = (firstAudioUrl && firstAudioUrl !== 'MULTI_SCENE_AUDIO') ? firstAudioUrl : audioUrl;

    // Filter out scenes that might not have images to prevent export crash
    const validatedScenes = workingScenes.filter(s => s.imageUrl);
    if (validatedScenes.length === 0) throw new Error("No scenes with valid images found for this segment.");

    const videoBlob = await exportToVideo(validatedScenes, effectiveAudioUrl, {
      aspectRatio: 'reel',
      onProgress: (p) => setExportProgress(p)
    });
    
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    const filename = targetPartIndex 
      ? `Auurio_Reel_Segment${targetPartIndex}_${Date.now()}.webm`
      : `Auurio_Full_Reel_${Date.now()}.webm`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    await creditService.deduct(profile.uid, CREDIT_COSTS.VIDEO_PRODUCTION, 'REEL_EXPORT');
  };

  const handleExportVideo = async (targetPartIndex?: number) => {
    if (scenes.length === 0) return;
    
    setIsExporting(true);
    const statusLabel = targetPartIndex ? `Finalizing Segment ${targetPartIndex}...` : 'Finalizing Full Reel Master...';
    setExportProgress({ progress: 0, status: statusLabel });
    
    try {
      await performVideoExport(targetPartIndex);
    } catch (err: any) {
      console.error("Reel Export error:", err);
      setError("Export failed: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAllParts = async () => {
    if (!isPartStory) return;
    
    const readyParts = Array.from({ length: numParts })
      .map((_, i) => i + 1)
      .filter(pNum => {
        const pScenes = scenes.filter(s => s.partIndex === pNum);
        return pScenes.length > 0 && pScenes.every(s => s.imageUrl && s.status.visual === 'done');
      });

    if (readyParts.length === 0) {
      setError("No production-ready parts found to export.");
      return;
    }

    setIsExporting(true);
    setStatusMessage(`Initializing batch export of ${readyParts.length} segments...`);
    
    try {
      for (let i = 0; i < readyParts.length; i++) {
        const pNum = readyParts[i];
        setExportProgress({ progress: 0, status: `Batch Production: Segment ${pNum} (${i+1}/${readyParts.length})` });
        await performVideoExport(pNum);
        // Safety delay to prevent browser download restrictions/UI freezing
        if (i < readyParts.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      setStatusMessage("All deliverables exported successfully!");
    } catch (err: any) {
      console.error("Batch Export error:", err);
      setError("Batch export failed: " + err.message);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

   const handleGenerateScript = async () => {
    if (!topic || topic.length < 5) return;
    setError('');
    setIsLoading(true);
    setProgress(15);
    setStatusMessage('Scripting Cohesive Viral Story...');

    try {
      const hasCredits = await creditService.checkBalance(profile.uid, CREDIT_COSTS.STORY_GENERATION);
      if (!hasCredits) throw new Error('Insufficient credits.');

      const totalSeconds = isPartStory ? numParts * partLength * 60 : length * 60;
      
      const prompt = `ACT AS A VIRAL SHORT-FORM RETENTION MASTER. 
      Your mission is to write an ultra-high-energy, fast-paced vertical storytelling script in ${language} about: ${topic}.
      
      RETENTION RULES (MANDATORY):
      - START WITH A JOLT. The first 2 seconds must be a "Pattern Interrupt" hook that makes scrolling impossible.
      - PACING: High-speed energetic delivery. Every sentence must be a punch. ABSOLUTELY NO FILLER.
      - FAST TRANSITIONS: The story must move forward every 3-4 seconds.
      - RETENTION LOOPS: End every small segment with a mystery.
      
      ${isPartStory ? `EPISODIC SYSTEM:
      DIVIDE INTO EXACTLY ${numParts} PARTS. 
      Each part MUST BE DENSE and fill ROUGHLY ${partLength} MINUTE(S).
      
      STRICT TEMPLATE PER PART:
      [PART X START]
      [HOOK] (A devastatingly engaging opening line that builds on the previous part's mystery. Max 5-7 words.) [/HOOK]
      [NARRATION] (The core content. DENSE AND LONG. For a ${partLength} minute part, you MUST PROVIDE AT LEAST ${partLength * 35} PUNCHY SENTENCES. The pacing must be relentless.) [/NARRATION]
      [CLIFFHANGER] (A massive unanswered question or a "to be continued" twist. End with a subtle, natural CTA like "You won't believe what happens in Part ${numParts > 1 ? '2' : 'X'}..." or "The reveal in the next part is insane...") [/CLIFFHANGER]
      [PART X END]` : `CONTINUOUS RETENTION: Hook at 0s, Suspense peaks every 10s, Payoff at 45s, and a viral loop ending. Total duration: ${totalSeconds}s.`}

      OUTPUT FORMAT:
      [NARRATIVE]
      ${isPartStory ? `(PROVIDE ALL ${numParts} PARTS SEQUENTIALLY)` : `(ONE CONTINUOUS MASTER SCRIPT)`}
      [/NARRATIVE]

      [VISUALS]
      Provide one [VISUAL] prompt per 3.5 seconds of story (approx. ${Math.ceil(totalSeconds / 3.5)} prompts total). 
      Prompts must be: 9:16 aspect ratio, cinematic, high-motion, realistic vertical footage descriptions.
      Example: 1. [VISUAL] Extreme close up of sweat on a runner's face, cinematic lighting, high motion blur...
      [/VISUALS]

      REMEMBER: In ${language}. No slow buildup. Absolute depth and length. Reach the ${isPartStory ? partLength + ' minute' : totalSeconds + 's'} target.` ;

      const generatedContent = await aiService.generateText(prompt, undefined, (status) => setStatusMessage(status));
      if (!generatedContent) throw new Error("Auurio Engine returned empty content. Please try again.");
      
      setFullScript(generatedContent);
      
      // Robust block extraction
      let finalNarration = "";
      let finalVisuals: string[] = [];

      const narrativeBlock = generatedContent.match(/\[NARRATIVE\]([\s\S]*?)\[\/NARRATIVE\]/i);
      const visualsBlock = generatedContent.match(/\[VISUALS\]([\s\S]*?)\[\/VISUALS\]/i);

      if (narrativeBlock) {
        finalNarration = narrativeBlock[1].trim();
      } else {
        // Fallback: take everything before visuals
        finalNarration = generatedContent.split(/\[VISUALS\]/i)[0].replace(/\[NARRATIVE\]/gi, '').trim();
      }

      if (visualsBlock) {
        finalVisuals = visualsBlock[1].split(/\[VISUAL\]/i).map(p => p.trim().replace(/Part\s+\d+|Segment\s+\d+/gi, '')).filter(p => p.length > 5);
      } else {
        // Fallback: search for visual markers anywhere
        finalVisuals = generatedContent.split(/\[VISUAL\]/i).slice(1).map(p => p.trim().split(/\[\/VISUAL\]/i)[0].replace(/Part\s+\d+|Segment\s+\d+/gi, '')).filter(p => p.length > 5);
      }

      if (!finalNarration) {
        throw new Error("Failed to extract story narrative. AI output format mismatch.");
      }

      const initialScenes = processGeneratedContent(finalNarration, finalVisuals, 0, true);
      setScenes(initialScenes);
      setImages(initialScenes.map(s => s.imageUrl));
      setFullScript(finalNarration);
      
      await creditService.deduct(profile.uid, CREDIT_COSTS.STORY_GENERATION, 'STORY_GENERATION');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const pRef = await addDoc(collection(db, 'projects'), {
        userId: profile.uid,
        title: topic,
        topic,
        type: 'reel',
        status: 'draft',
        progress: 0,
        activeStep: 'editor',
        fullScript: finalNarration,
        scenes: initialScenes,
        language,
        length,
        theme,
        voice,
        isPartStory,
        numParts,
        partLength,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt
      });
      setProjectId(pRef.id);
      window.history.pushState({}, '', `?projectId=${pRef.id}`);

      setProgress(100);
      setStatusMessage('Viral Narrative Ready!');
      setIsLoading(false);
      setActiveStep('editor');
    } catch (err: any) {
      console.error("Story Generation Failure:", err);
      setError(err.message || "Failed to generate viral story.");
      setIsLoading(false);
    } finally {
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const partitionScript = (text: string, visuals: string[]): Scene[] => {
    let parsedScenes: Scene[] = [];
    
    if (isPartStory) {
      const partRegex = /\[PART (\d+) START\]([\s\S]*?)\[PART \1 END\]/gi;
      const matches = Array.from(text.matchAll(partRegex));
      
      if (matches.length > 0) {
        matches.forEach((m, pIdx) => {
          const partIndex = pIdx + 1;
          const rawContent = m[2].trim();
          
          // Split into Hook, Body, Cliffhanger
          const hookMatch = rawContent.match(/\[HOOK\]([\s\S]*?)\[\/HOOK\]/i);
          const narrationMatch = rawContent.match(/\[NARRATION\]([\s\S]*?)\[\/NARRATION\]/i);
          const cliffMatch = rawContent.match(/\[CLIFFHANGER\]([\s\S]*?)\[\/CLIFFHANGER\]/i);

          const hook = hookMatch ? hookMatch[1].trim() : "";
          const body = narrationMatch ? narrationMatch[1].trim() : "";
          const cliff = cliffMatch ? cliffMatch[1].trim() : "";

          // Frame count logic: 1 frame every 3.5 seconds.
          // For a 1-minute part (60s), we want ~17 frames.
          const targetFramesForPart = Math.ceil((partLength * 60) / 3.5);
          
          // Scene 1: Hook
          if (hook) {
            parsedScenes.push({
              id: Math.random().toString(36).substr(2, 9),
              partIndex,
              visualPrompt: visuals[parsedScenes.length] || `Viral hook visual for segment ${partIndex}: ${topic}`,
              narration: hook,
              imageUrl: '',
              isHook: true,
              status: { story: 'done', voice: 'pending', visual: 'pending' }
            });
          }

          // Scenes 2 to N-1: Body
          const bodySegments = Math.max(1, targetFramesForPart - 2);
          const charsPerSegment = Math.ceil(body.length / bodySegments);
          for (let i = 0; i < bodySegments; i++) {
            const start = i * charsPerSegment;
            const textSeg = body.substring(start, start + charsPerSegment).trim();
            if (textSeg.length < 3) continue;

            parsedScenes.push({
              id: Math.random().toString(36).substr(2, 9),
              partIndex,
              visualPrompt: visuals[parsedScenes.length] || `High intensity scene ${i+2} for segment ${partIndex}`,
              narration: textSeg,
              imageUrl: '',
              status: { story: 'done', voice: 'pending', visual: 'pending' }
            });
          }

          // Final Scene: Cliffhanger
          if (cliff) {
            parsedScenes.push({
              id: Math.random().toString(36).substr(2, 9),
              partIndex,
              visualPrompt: visuals[parsedScenes.length] || `Cliffhanger visual for segment ${partIndex}: ${topic}`,
              narration: cliff,
              imageUrl: '',
              isCliffhanger: true,
              status: { story: 'done', voice: 'pending', visual: 'pending' }
            });
          }
        });
      }
    }

    // Fallback if not part story or parsing failed
    if (parsedScenes.length === 0) {
      const totalSeconds = length * 60;
      const targetFrames = Math.max(visuals.length, Math.ceil(totalSeconds / 3.5));
      
      // Smart splitting based on sentence boundaries if possible
      const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
      const sentencesPerFrame = Math.max(1, Math.ceil(sentences.length / targetFrames));
      
      for (let i = 0; i < targetFrames; i++) {
        const frameSentences = sentences.slice(i * sentencesPerFrame, (i + 1) * sentencesPerFrame);
        const frameText = frameSentences.join('').trim();
        if (!frameText) continue;

        parsedScenes.push({
          id: Math.random().toString(36).substr(2, 9),
          partIndex: 1,
          visualPrompt: visuals[i] || `Vertical high impact cinematic frame ${i + 1}`,
          narration: frameText,
          imageUrl: '',
          isHook: i === 0,
          isCliffhanger: i === targetFrames - 1,
          status: { story: 'done', voice: 'pending', visual: 'pending' }
        });
      }
    }

    return parsedScenes;
  };

  const processGeneratedContent = (fullNarration: string, visualPrompts: string[], dummyArg = 0, returnOnly = false) => {
    const parsedScenes = partitionScript(fullNarration, visualPrompts);

    if (returnOnly) return parsedScenes;

    setScenes(parsedScenes);
    setImages(parsedScenes.map(s => s.imageUrl));
    setFullScript(fullNarration);
  };

  const handleConfirmScript = () => {
    console.log(`Auurio: Viral partitioning Reel storyboard...`);

    const currentVisuals = scenes.map(s => s.visualPrompt);
    const updatedScenes = partitionScript(fullScript, currentVisuals);
    
    setScenes(updatedScenes);
    setActiveStep('voice');
  };

  const handleGenerateVoice = async () => {
    if (scenes.length === 0) {
      setError("No scenes found to narrate. Please generate a script first.");
      return;
    }
    setError(null);
    setIsLoading(true);
    setProgress(0);
    setStatusMessage("Initializing Neural Voice Engine...");
    saveProjectState({ status: 'processing' });

    try {
      const hasCredits = await creditService.checkBalance(profile.uid, CREDIT_COSTS.AUDIO_CONVERSION);
      if (!hasCredits) throw new Error('Insufficient credits.');

      if (!fullScript || fullScript.trim().length < 10) {
        throw new Error("Viral script is missing or too short. Please refine in the editor.");
      }

      setStatusMessage("EPISODIC SYNTHESIS: High-Impact Neural Narrator mastering...");
      
      const partRegex = /\[PART (\d+) START\]([\s\S]*?)\[PART \1 END\]/gi;
      const partMatches = Array.from(fullScript.matchAll(partRegex));
      
      if (isPartStory && partMatches.length > 0) {
        // Multi-part independent synthesis
        const partAudios: { index: number; url: string; duration: number }[] = [];
        
        for (let i = 0; i < partMatches.length; i++) {
          const m = partMatches[i];
          const partIdx = parseInt(m[1]);
          const rawContent = m[2].trim();
          const cleanPartText = rawContent
            .replace(/\[PART \d+ START\]|\[PART \d+ END\]|\[HOOK\]|\[\/HOOK\]|\[NARRATION\]|\[\/NARRATION\]|\[CLIFFHANGER\]|\[\/CLIFFHANGER\]/gi, '')
            .trim();
          
          if (!cleanPartText || cleanPartText.length < 2) continue;

          setStatusMessage(`Synthesizing Segment ${partIdx}/${partMatches.length}...`);
          const res = await aiService.generateAudio(cleanPartText, voice, language, {
            pitch: voiceTone,
            speed: voiceSpeed,
            onProgress: (p) => setProgress(Math.floor((i / partMatches.length) * 100) + Math.floor(p / partMatches.length))
          });
          
          if (res.url) {
            const audio = new Audio(res.url);
            const duration = await new Promise<number>((resolve) => {
              audio.onloadedmetadata = () => resolve(audio.duration);
              setTimeout(() => resolve(cleanPartText.length * 0.1), 3000); // Fallback
            });
            partAudios.push({ index: partIdx, url: res.url, duration });
          }
        }

        if (partAudios.length === 0) throw new Error("Voice synthesis failure for parts. Try again or check your script.");

        // Assign part-specific audio to scenes
        setScenes(prev => prev.map(s => {
          const partAudio = partAudios.find(pa => pa.index === s.partIndex);
          if (partAudio) {
            const scenesInPart = prev.filter(ps => ps.partIndex === s.partIndex);
            const totalCharsInPart = scenesInPart.reduce((acc, curr) => acc + curr.narration.length, 0) || 1;
            const weight = s.narration.length / totalCharsInPart;
            
            return {
              ...s,
              audioUrl: partAudio.url,
              audioDuration: Math.max(2, weight * partAudio.duration),
              status: { ...s.status, voice: 'done' }
            };
          }
          return s;
        }));

        setAudioUrl(partAudios[0].url);

      } else {
        // Single cohesive story synthesis
        const cleanScript = fullScript.replace(/\[PART \d+ START\]|\[PART \d+ END\]|\[NARRATION\]|\[\/NARRATION\]|\[HOOK\]|\[\/HOOK\]|\[CLIFFHANGER\]|\[\/CLIFFHANGER\]/gi, '').trim();
        setStatusMessage("Synthesizing Continuous Viral Narrative...");
        
        const res = await aiService.generateAudio(cleanScript, voice, language, {
          pitch: voiceTone,
          speed: voiceSpeed,
          onProgress: (p) => setProgress(p)
        });
        
        if (!res.url) throw new Error("Neural synthesis returned empty audio. Please retry.");
        setAudioUrl(res.url);

        const audio = new Audio(res.url);
        const totalDuration = await new Promise<number>((resolve) => {
          audio.onloadedmetadata = () => resolve(audio.duration);
          audio.onerror = () => resolve(cleanScript.length * 0.1);
          setTimeout(() => resolve(cleanScript.length * 0.1), 5000);
        });

        const totalChars = scenes.reduce((sum, s) => sum + s.narration.length, 0) || 1;

        setScenes(prev => prev.map(s => {
          const weight = s.narration.length / totalChars;
          return {
            ...s,
            audioUrl: 'MULTI_SCENE_AUDIO',
            audioDuration: Math.max(2, weight * totalDuration),
            status: { ...s.status, voice: 'done' }
          };
        }));
      }

      await creditService.deduct(profile.uid, CREDIT_COSTS.AUDIO_CONVERSION, 'VOICE_SYNTHESIS');
      setProgress(100);
      setStatusMessage('Voice Mastering Complete!');
      setTimeout(() => setActiveStep('visuals'), 800);
    } catch (err: any) {
      console.error("Narration synthesis failed:", err);
      setError(err.message || "Synthesis failure.");
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handlePreviewVoice = async (textSample: string, vId: string) => {
    if (isLoading) return;
    setIsLoading(true);
    setStatusMessage(`Testing ${vId.split('-').pop()}'s tone...`);
    try {
      const res = await aiService.generateAudio(textSample, vId, language, {
        pitch: voiceTone,
        speed: voiceSpeed
      });
      const audio = new Audio(res.url);
      audio.play();
    } catch (err: any) {
      setError("Preview failed: " + err.message);
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(''), 2000);
    }
  };

  const handleGenerateVisuals = async (passedScenes?: Scene[] | React.MouseEvent) => {
    const workingScenes = Array.isArray(passedScenes) ? passedScenes : [...scenes];
    if (workingScenes.length === 0) return;

    // Fast transition if all workingScenes already have images
    const hasAnyMissing = workingScenes.some(s => !s.imageUrl || s.status.visual !== 'done');
    if (!hasAnyMissing) {
      setStatusMessage('Storyboard already perfected! Starting Production...');
      setProgress(100);
      setIsLoading(false);
      setActiveStep('video');
      setTimeout(() => {
        handleAssembleVideo();
        setStatusMessage('');
      }, 500);
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setError("");
    setStatusMessage('Mastering visual aesthetic engine...');
    saveProjectState({ status: 'processing' });
    
    let localScenes = [...workingScenes];

    try {
      const hasCredits = await creditService.checkBalance(profile.uid, CREDIT_COSTS.IMAGE_GENERATION);
      if (!hasCredits) throw new Error('Insufficient credits.');

      const totalScenes = localScenes.length;
      let completedCount = localScenes.filter(s => s.imageUrl && s.status.visual === 'done').length;

      // Initial progress set
      setProgress(Math.floor((completedCount / totalScenes) * 100));

      // Controlled parallelism (Concurrency 4) for Reels to ensure high-speed but stable production
      const CONCURRENCY = 4;
      for (let i = 0; i < totalScenes; i += CONCURRENCY) {
        const batch = localScenes.slice(i, i + CONCURRENCY);
        const batchIndices = Array.from({ length: batch.length }, (_, k) => i + k);

        await Promise.all(batch.map(async (scene, batchIdx) => {
          const index = batchIndices[batchIdx];
          
          if (scene.imageUrl && scene.status.visual === 'done') {
            return;
          }

          localScenes[index] = { ...localScenes[index], status: { ...localScenes[index].status, visual: 'processing' } };
          setScenes([...localScenes]);

          try {
            const url = await generateSingleSceneImage(scene);
            
            localScenes[index] = { 
              ...localScenes[index], 
              imageUrl: url, 
              status: { ...localScenes[index].status, visual: 'done' } 
            };
            
            setScenes([...localScenes]);
            
            setImages(prev => {
              const next = [...prev];
              next[index] = url;
              return next;
            });

            completedCount++;
            setProgress(Math.round((completedCount / totalScenes) * 100));
          } catch (err) {
            console.error(`Failed to generate Reel frame ${index}:`, err);
            localScenes[index] = { ...localScenes[index], status: { ...localScenes[index].status, visual: 'error' } };
            setScenes([...localScenes]);
          }
        }));
        
        if (i + CONCURRENCY < totalScenes) {
          await new Promise(r => setTimeout(r, 400));
        }
      }

      // SYNC COMPLETION CHECK
      const successfulFrames = localScenes.filter(s => s.imageUrl).length;
      
      // We prioritize UX: if 90%+ frames are ready, transition immediately.
      // We can clean up/deduct in the background.
      if (successfulFrames >= Math.floor(totalScenes * 0.9) || successfulFrames === totalScenes) {
        setStatusMessage('Reel storyboard mastered! Finalizing production...');
        setProgress(100);
        
        // IMMEDIATE TRANSITION
        setActiveStep('video');
        setIsLoading(false);
        handleAssembleVideo();

        // Background cleanup tasks
        const cleanup = async () => {
          try {
            await creditService.deduct(profile.uid, CREDIT_COSTS.IMAGE_GENERATION, 'VISUAL_GENERATION');
            saveProjectState({ 
              scenes: localScenes,
              status: 'ready', 
              progress: 100,
              activeStep: 'video' 
            }).catch(e => console.warn("Background save failed", e));
          } catch (e) {
            console.warn("Background cleanup tasks partially failed", e);
          }
        };
        cleanup();
      } else {
        setIsLoading(false);
        setStatusMessage('Some frames failed. Please retry or generate again.');
      }
    } catch (err: any) {
      console.error("Reel Generator Error:", err);
      setError(err.message || "Visual generation failed.");
      setIsLoading(false);
    } finally {
      // Safety release
      setTimeout(() => {
        setIsLoading(prev => prev ? false : prev);
      }, 3000);
    }
  };

  const handleRetryFailedVisuals = async () => {
    const failedIndices = scenes.map((s, i) => s.status.visual === 'error' ? i : -1).filter(i => i !== -1);
    if (failedIndices.length === 0) return;
    
    setIsLoading(true);
    setStatusMessage(`Retrying ${failedIndices.length} failed frames...`);
    try {
      let rectCount = 0;
      for (const idx of failedIndices) {
        setStatusMessage(`Rescue attempt: Frame ${idx + 1}...`);
        try {
          const url = await generateSingleSceneImage(scenes[idx]);
          setScenes(prev => {
            const next = [...prev];
            next[idx] = { 
              ...next[idx], 
              imageUrl: url, 
              status: { ...next[idx].status, visual: 'done' } 
            };
            return next;
          });
          rectCount++;
        } catch (e) {
          console.error(`Retry failed for index ${idx}`);
        }
        await new Promise(r => setTimeout(r, 1000));
      }
      setStatusMessage(rectCount > 0 ? "Reel storyboard rescued!" : "Some frames still resistant.");
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const generateSingleSceneImage = async (sceneData: any) => {
    const visualPart = sceneData.visualPrompt;
    let styleModifiers: string;
    const reelKeywords = "social media aesthetic, vertical 9:16 composition, high impact, trend-forward, vibrant, sharp focus, 8k resolution, absolutely no text, no labels, no parts, no numbers.";
    
    if (theme === 'Realistic') {
      styleModifiers = `${reelKeywords} photorealistic smartphone photography, golden hour glow, portrait lighting, close-up details.`;
    } else if (theme === 'Anime') {
      styleModifiers = `${reelKeywords} vivid anime illustration, dynamic vertical composition, glowing atmosphere, clean lines.`;
    } else {
      styleModifiers = `${reelKeywords} cinematic vertical visual, high contrast, artistic 9:1layout, energetic flow.`;
    }

    const prompt = `Vertical Reel: ${visualPart}. Aesthetic: ${styleModifiers}`;
    const negativePrompt = "text, watermark, label, letters, words, part number, segment number, landscape, horizontal, black bars, frame, border, low resolution, blurry, distorted features.";
    
    const maxAttempts = 2; 
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Auurio: Reel Frame master attempt ${attempt}`);
        
        // Add a hard timeout to prevent Promise.all from hanging
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 90000)
        );

        const genPromise = aiService.generateImage(prompt, { 
          width: 1024, 
          height: 1792, 
          negativePrompt, 
          useFlash: true,
          style: theme 
        });

        const url = await Promise.race([genPromise, timeoutPromise]);

        if (url && (url.startsWith('http') || url.length > 1000)) return url;
        throw new Error("Invalid image");
      } catch (e) {
        console.warn(`Auurio: Reel Frame attempt ${attempt} failed:`, e);
        if (attempt === maxAttempts) break;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    return aiService.generateImageUrl(prompt, 1024, 1792);
  };

  const handleRegenerateScene = async (index: number) => {
    setIsLoading(true);
    setStatusMessage(`Regenerating frame ${index + 1}...`);
    try {
      setScenes(prev => {
        const next = [...prev];
        next[index] = { ...next[index], status: { ...next[index].status, visual: 'processing' } };
        return next;
      });

      const url = await generateSingleSceneImage(scenes[index]);
      
      setScenes(prev => {
        const next = [...prev];
        next[index] = { 
          ...next[index], 
          imageUrl: url, 
          status: { ...next[index].status, visual: 'done' } 
        };
        return next;
      });
      
      setImages(prev => {
        const next = [...prev];
        next[index] = url;
        return next;
      });
      setStatusMessage('Frame updated!');
    } catch (err: any) {
      setError(err.message);
      setScenes(prev => {
        const next = [...prev];
        next[index] = { ...next[index], status: { ...next[index].status, visual: 'error' } };
        return next;
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(''), 2000);
    }
  };

  const removeScene = (index: number) => {
    setScenes(prev => prev.filter((_, i) => i !== index));
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const moveScene = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= scenes.length) return;
    
    setScenes(prev => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
    setImages(prev => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  const updateScene = (index: number, field: 'narration' | 'visualPrompt', value: string) => {
    setScenes(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAssembleVideo = async () => {
    setActiveStep('video');
    setIsLoading(true);
    setProgress(0);
    setError('');
    let currentPid = projectId;
    try {
      if (!currentPid) {
        const pRef = await addDoc(collection(db, 'projects'), {
          userId: profile.uid,
          title: topic,
          type: 'reel',
          status: 'processing',
          progress: 0,
          createdAt: serverTimestamp()
        });
        currentPid = pRef.id;
        setProjectId(currentPid);
      } else {
        await updateDoc(doc(db, 'projects', currentPid), { status: 'processing', progress: 0 });
      }

      const stepsList = [
        "Analyzing Segment sync...",
        "Applying viral color grading...",
        "Arranging storyboard assets...",
        "Mixing optimized soundscapes...",
        "Finalizing production render..."
      ];

      for (let i = 0; i < stepsList.length; i++) {
        setStatusMessage(stepsList[i]);
        const stepDuration = 800; // Faster simulation 1.5s -> 0.8s
        const ticks = 8;
        const tickMs = stepDuration / ticks;
        
        for (let t = 0; t < ticks; t++) {
          const stepProgress = Math.floor((t / ticks) * 20);
          const totalProgress = (i * 20) + stepProgress;
          setProgress(totalProgress);
          
          if (t === 4 && currentPid) {
             updateDoc(doc(db, 'projects', currentPid), { progress: totalProgress }).catch(console.warn);
          }
          await new Promise(r => setTimeout(r, tickMs));
        }
      }
      
      setProgress(100);
      setStatusMessage('Reel Perfected!');
      setVideoUrl('DONE');
      
      await updateDoc(doc(db, 'projects', currentPid), {
        status: 'completed',
        progress: 100
      });
      
      await addDoc(collection(db, 'stories'), {
        userId: profile.uid,
        title: topic,
        type: 'reel',
        script: scenes.map(s => s.narration).join('\n'),
        audioUrl,
        images,
        createdAt: serverTimestamp(),
        status: 'completed'
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProject = async (pid: string) => {
    setProjectId(pid);
    setIsLoading(true);
    setStatusMessage('Restoring Workspace State...');
    try {
      const snap = await getDoc(doc(db, 'projects', pid));
      if (snap.exists()) {
        const data = snap.data();
        if (data.scenes) {
          setScenes(data.scenes);
          setImages(data.scenes.map((s: any) => s.imageUrl || ''));
        }
        if (data.activeStep) setActiveStep(data.activeStep as Step);
        if (data.topic) setTopic(data.topic);
        if (data.title && !data.topic) setTopic(data.title);
        if (data.progress) setProgress(data.progress);
        if (data.theme) setTheme(data.theme);
        if (data.fullScript) setFullScript(data.fullScript);
        if (data.language) setLanguage(data.language);
        if (data.voice) setVoice(data.voice);
        if (data.length) setLength(data.length);
        if (data.isPartStory) setIsPartStory(data.isPartStory);
        if (data.numParts) setNumParts(data.numParts);
        if (data.partLength) setPartLength(data.partLength);
        if (data.audioUrl) setAudioUrl(data.audioUrl);
        if (data.videoUrl) setVideoUrl(data.videoUrl);
        if (data.currentPreviewPart) setCurrentPreviewPart(data.currentPreviewPart);

        // Fallback: Reconstruct script if missing
        if (!data.fullScript && data.scenes && data.scenes.length > 0) {
          const reconstructed = data.scenes.map((s: any) => s.narration).join('\n');
          setFullScript(reconstructed);
        }
        
        if (data.status === 'processing') {
          // Determine which step to resume based on missing data
          setTimeout(() => {
             if (data.activeStep === 'visuals') {
                const missingAny = data.scenes?.some((s: any) => !s.imageUrl);
                if (missingAny) {
                  handleGenerateVisuals(data.scenes);
                } else { 
                  setIsLoading(false);
                  setStatusMessage('Production Synchronized');
                  handleAssembleVideo();
                }
             } else if (data.activeStep === 'voice') {
                handleGenerateVoice();
             } else {
                setIsLoading(false);
                setStatusMessage('Workspace Restored');
                setTimeout(() => setStatusMessage(''), 2000);
             }
          }, 800);
        } else {
          setIsLoading(false);
          setStatusMessage('Workspace Restored');
          setTimeout(() => setStatusMessage(''), 2000);
        }
      }
    } catch (e) {
      console.error("Load failed", e);
      setError("Failed to restore project state.");
    } finally {
      setIsLoading(false);
      isProjectLoading.current = false; // Mark loading as done
      if (!error) {
        setStatusMessage('Workspace Restored');
        setTimeout(() => setStatusMessage(''), 2000);
      }
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('projectId');
    if (pid) {
      isProjectLoading.current = true;
      // Use setTimeout to avoid synchronous state update in effect
      const timer = setTimeout(() => {
        loadProject(pid);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const steps = [
    { id: 'script', label: 'Hook', icon: Sparkles, color: 'text-red-500', bg: 'bg-red-500/10' },
    { id: 'editor', label: 'Editor', icon: Type, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'voice', label: 'Audio', icon: Volume2, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'visuals', label: 'Frames', icon: ImageIcon, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'video', label: 'Render', icon: Smartphone, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div className="space-y-2 md:space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 md:p-3 bg-red-500/20 rounded-xl md:rounded-2xl">
                <Video className="w-6 h-6 md:w-8 md:h-8 text-red-500" />
              </div>
              <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase italic line-clamp-1">ReelAura</h1>
            </div>
            {projectId && (
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Workspace Live</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs md:text-sm text-zinc-500 font-medium max-w-xl">
              High-impact vertical content machine. Build viral Reels and Shorts in minutes.
            </p>
            {projectId && topic && (
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/5 rounded-2xl">
                <Layout className="w-3 h-3 text-red-500" />
                <span className="text-[10px] font-black text-white uppercase tracking-tighter max-w-[150px] truncate">{topic}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Path */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 custom-scrollbar scrollbar-hide">
        {steps.map((s, idx) => {
          const StepIcon = s.icon;
          const isActive = activeStep === s.id;
          
          // Improved logic for step accessibility and completion
          const hasScript = !!fullScript;
          const hasScenes = scenes.length > 0;
          const hasVoice = !!audioUrl || scenes.some(sc => !!sc.audioUrl);
          const hasVisuals = scenes.length > 0 && scenes.every(sc => !!sc.imageUrl);

          let isAccessible = idx === 0;
          if (s.id === 'editor') isAccessible = hasScript;
          if (s.id === 'voice') isAccessible = hasScript;
          if (s.id === 'visuals') isAccessible = hasScenes;
          if (s.id === 'video') isAccessible = hasScenes;

          const isCompleted = (s.id === 'script' && hasScript) ||
                            (s.id === 'editor' && hasScenes) ||
                            (s.id === 'voice' && hasVoice) ||
                            (s.id === 'visuals' && hasVisuals) ||
                            (s.id === 'video' && !!videoUrl);

          return (
            <div key={s.id} className="flex items-center gap-2 md:gap-3 shrink-0">
              <button 
                disabled={!isAccessible}
                onClick={() => setActiveStep(s.id as Step)}
                className={cn(
                  "flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all min-w-[120px] md:min-w-0",
                  isActive ? "bg-zinc-900 border-white/20 ring-2 ring-red-500/20" : 
                  isAccessible ? "bg-zinc-900/50 border-white/5 opacity-80" : 
                  "bg-black/20 border-white/5 opacity-30 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "p-1.5 md:p-2 rounded-lg md:rounded-xl shrink-0 transition-all", 
                  isActive ? s.bg : "bg-zinc-800/50",
                  isActive ? s.color : isCompleted ? "text-green-500" : "text-zinc-600"
                )}>
                  {isCompleted && !isActive ? <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <StepIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-zinc-600 truncate">STG {idx + 1}</p>
                  <p className={cn("text-[10px] md:text-xs font-black uppercase tracking-tighter truncate", isActive ? "text-white" : "text-zinc-500")}>{s.label}</p>
                </div>
              </button>
              {idx < steps.length - 1 && <ChevronRight size={14} className="text-zinc-800 shrink-0" />}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900 border border-white/5 p-6 rounded-[32px] space-y-6">
            {activeStep === 'script' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Reel Topic / Hook</label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. 5 things science can't explain..."
                    className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-red-500 outline-none transition-all h-32 resize-none"
                  />
                </div>

                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400">Story Mode</span>
                    <div className="flex bg-zinc-800 p-1 rounded-lg">
                      <button 
                        onClick={() => setIsPartStory(false)}
                        className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-tighter rounded-md transition-all", !isPartStory ? "bg-red-500 text-white" : "text-zinc-500")}
                      >
                        Single
                      </button>
                      <button 
                        onClick={() => setIsPartStory(true)}
                        className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-tighter rounded-md transition-all", isPartStory ? "bg-red-500 text-white" : "text-zinc-500")}
                      >
                        Parts
                      </button>
                    </div>
                  </div>

                  {isPartStory ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">Parts</label>
                        <input 
                          type="number" min="2" max="10" value={numParts || 2} 
                          onChange={(e) => setNumParts(parseInt(e.target.value))}
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">Min / Part</label>
                        <select 
                          value={partLength || 1} 
                          onChange={(e) => setPartLength(parseInt(e.target.value))}
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white appearance-none"
                        >
                          {[1, 3, 5, 10].map(m => (
                            <option key={m} value={m}>{m} min</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">Total Duration</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 3, 5, 10].map((m) => (
                          <button
                            key={m}
                            onClick={() => setLength(m)}
                            className={cn(
                              "py-2 rounded-lg font-black text-[10px] uppercase transition-all",
                              length === m 
                                ? "bg-red-600 text-white shadow-lg shadow-red-600/20" 
                                : "bg-black/40 border border-white/5 text-zinc-500 hover:text-zinc-400"
                            )}
                          >
                            {m}m
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                   <div className="flex items-center gap-2 px-1">
                    <Languages size={12} className="text-zinc-500" />
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Narration Language</label>
                   </div>
                   <div className="grid grid-cols-3 gap-2">
                    {['English', 'Hindi', 'Bangla'].map(l => (
                      <button 
                        key={l}
                        onClick={() => setLanguage(l as any)}
                        className={cn(
                          "py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-tighter transition-all",
                          language === l ? "bg-red-500/10 border-red-500/50 text-white" : "bg-black/40 border-white/5 text-zinc-600 hover:text-zinc-400"
                        )}
                      >
                        {l}
                      </button>
                    ))}
                   </div>
                </div>

                <button 
                  onClick={handleGenerateScript}
                  disabled={isLoading || !topic}
                  className="w-full py-4 bg-red-500 text-white font-black uppercase tracking-tighter flex items-center justify-center gap-2 rounded-2xl hover:bg-red-400 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-red-500/10"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  Generate Reel Script
                </button>
              </motion.div>
            )}

            {activeStep === 'editor' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-red-500">
                    <Type size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Reel Script Editor</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                    Viral reels require tight pacing. Refine your narrative to hit the 15s to 60s beats perfectly. Use the editor to add intensity markers or adjust the hook.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Engagement Tools</label>
                  <div className="grid grid-cols-1 gap-2">
                    <button 
                      onClick={() => setFullScript(prev => prev.toUpperCase())}
                      className="w-full py-3 bg-black/40 border border-white/5 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                    >
                      Impact Case (Uppercase)
                    </button>
                    <button 
                      onClick={() => setFullScript(prev => prev.replace(/\n\n/g, '\n').replace(/\n/g, '... ')) }
                      className="w-full py-3 bg-black/40 border border-white/5 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                    >
                      Add Breath Pauses (...)
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleConfirmScript}
                  className="w-full py-4 bg-white text-black font-black uppercase tracking-tighter flex items-center justify-center gap-2 rounded-2xl hover:bg-zinc-200 transition-all shadow-xl"
                >
                  Proceed to Audio <ChevronRight size={18} />
                </button>
              </motion.div>
            )}

            {activeStep === 'voice' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Viral Voice Selection</label>
                  
                  {/* Styled Professional Dropdown */}
                  <div className="relative group">
                    <select
                      value={voice}
                      onChange={(e) => setVoice(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm text-white appearance-none cursor-pointer focus:border-red-500 outline-none transition-all pr-12 font-bold tracking-tight italic"
                    >
                      {VOICES[language].map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} — {v.style}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-hover:text-red-500 transition-colors">
                      <ChevronRight className="rotate-90" size={16} />
                    </div>
                  </div>

                  {/* High-End Preview Card */}
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={voice}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-5 bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20 rounded-[28px] flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => {
                            const v = VOICES[language].find(x => x.id === voice);
                            if (v) handlePreviewVoice(`Yo, this is ${v.name}. Let's make this reel absolute fire with neural narration.`, v.id);
                          }}
                          className="w-12 h-12 flex items-center justify-center bg-red-500 text-white rounded-2xl hover:bg-red-400 transition-all shadow-xl shadow-red-500/20 active:scale-90"
                        >
                          <Play size={16} fill="currentColor" className={isLoading && statusMessage.includes('tone') ? "animate-pulse" : ""} />
                        </button>
                        <div>
                          <p className="text-base font-black text-white italic tracking-tighter">
                            {VOICES[language].find(v => v.id === voice)?.name}
                          </p>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">
                               {VOICES[language].find(v => v.id === voice)?.country}
                             </span>
                             <span className="w-4 h-px bg-zinc-800" />
                             <span className="text-[10px] text-red-500 uppercase font-black tracking-widest italic leading-none">
                               {VOICES[language].find(v => v.id === voice)?.style}
                             </span>
                          </div>
                        </div>
                      </div>
                      <Mic className="text-red-500/20 group-hover:text-red-500/50 transition-colors" size={24} />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Voice Tone</label>
                        <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-tighter italic">Deep → High</p>
                      </div>
                      <span className="text-[10px] font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">{voiceTone.toFixed(1)}x</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.5" max="1.5" step="0.1" 
                      value={voiceTone || 1.1}
                      onChange={(e) => setVoiceTone(parseFloat(e.target.value))}
                      className="w-full accent-red-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Energy Speed</label>
                        <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-tighter italic">Slow → Fast</p>
                      </div>
                      <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">{voiceSpeed.toFixed(1)}x</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.5" max="1.5" step="0.1" 
                      value={voiceSpeed || 1.1}
                      onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                      className="w-full accent-orange-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleGenerateVoice}
                  disabled={isLoading}
                  className="w-full py-4 bg-orange-500 text-white font-black uppercase tracking-tighter flex items-center justify-center gap-2 rounded-2xl hover:bg-orange-400 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                  Synthesize Voice
                </button>
              </motion.div>
            )}

            {activeStep === 'visuals' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                 <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Visual aesthetic</label>
                 <div className="grid grid-cols-2 gap-2">
                   {['Realistic', 'Anime', 'Abstract', 'Vlog Style'].map(t => (
                     <button 
                        key={t}
                        onClick={() => setTheme(t as any)}
                        className={cn(
                          "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                          theme === t ? "bg-blue-500/10 border-blue-500/50 text-white" : "bg-black/40 border-white/5 text-zinc-600 hover:text-zinc-400"
                        )}
                      >
                        {t}
                      </button>
                   ))}
                 </div>

                 <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <Smartphone size={12} className="text-blue-500" />
                        Reel Branding
                      </label>
                      <button 
                        onClick={() => setWatermark(prev => ({ ...prev, enabled: !prev.enabled }))}
                        className={cn(
                          "text-[8px] font-black uppercase px-2 py-1 rounded-full border transition-all",
                          watermark.enabled ? "bg-blue-500 border-blue-500 text-white" : "border-white/10 text-zinc-500"
                        )}
                      >
                        {watermark.enabled ? 'On' : 'Off'}
                      </button>
                    </div>

                    {watermark.enabled && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-2">
                        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                          <button
                            onClick={() => setWatermark(prev => ({ ...prev, mode: 'text' }))}
                            className={cn(
                              "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                              watermark.mode === 'text' ? "bg-red-500 text-white" : "text-zinc-500 hover:text-zinc-400"
                            )}
                          >
                            Text
                          </button>
                          <button
                            onClick={() => setWatermark(prev => ({ ...prev, mode: 'logo' }))}
                            className={cn(
                              "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                              watermark.mode === 'logo' ? "bg-red-500 text-white" : "text-zinc-500 hover:text-zinc-400"
                            )}
                          >
                            Logo
                          </button>
                        </div>

                        {watermark.mode === 'text' ? (
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Watermark Label</label>
                            <input 
                              type="text"
                              value={watermark.text}
                              onChange={(e) => setWatermark(prev => ({ ...prev, text: e.target.value }))}
                              className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-red-500/50 transition-all font-bold"
                              placeholder="@handle"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Source Logo</label>
                            {watermark.logoUrl ? (
                              <div className="relative aspect-video bg-black/40 rounded-xl border border-white/5 flex items-center justify-center p-2 group">
                                <img src={watermark.logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                <button 
                                  onClick={() => setWatermark(prev => ({ ...prev, logoUrl: '' }))}
                                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center aspect-video bg-black/40 border-2 border-dashed border-white/5 rounded-xl cursor-copy hover:border-red-500/30 transition-all">
                                <Upload size={16} className="text-zinc-600 mb-1" />
                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Upload PNG</span>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        setWatermark(prev => ({ ...prev, logoUrl: reader.result as string }));
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Alpha ({(watermark.opacity * 100).toFixed(0)}%)</label>
                            <input 
                              type="range"
                              min="10"
                              max="100"
                              step="10"
                              value={(watermark.opacity || 0) * 100}
                              onChange={(e) => setWatermark(prev => ({ ...prev, opacity: parseInt(e.target.value) / 100 }))}
                              className="w-full accent-blue-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Align</label>
                            <select 
                              value={watermark.position}
                              onChange={(e) => setWatermark(prev => ({ ...prev, position: e.target.value as any }))}
                              className="w-full bg-black/40 border border-white/5 rounded-xl px-2 py-1.5 text-xs text-white font-bold appearance-none cursor-pointer focus:outline-none focus:border-blue-500/50"
                            >
                              <option value="top-left">Top Left</option>
                              <option value="top-right">Top Right</option>
                              <option value="bottom-left">Bottom Left</option>
                              <option value="bottom-right">Bottom Right</option>
                              <option value="bottom-center">Bottom Center</option>
                              <option value="center">Center</option>
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                 <button 
                  onClick={() => handleGenerateVisuals()}
                  disabled={isLoading}
                  className="w-full py-4 bg-blue-500 text-white font-black uppercase tracking-tighter flex items-center justify-center gap-2 rounded-2xl hover:bg-blue-400 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                  Prepare Frames
                </button>
              </motion.div>
            )}

            {activeStep === 'video' && (
              <div className="space-y-6">
                <button 
                  onClick={() => handleAssembleVideo()}
                  disabled={isLoading}
                  className="w-full py-5 bg-gradient-to-r from-red-600 to-red-500 text-white font-black uppercase tracking-tighter flex items-center justify-center gap-3 rounded-[32px] hover:scale-105 transition-all active:scale-95 disabled:opacity-50 shadow-2xl shadow-red-600/20"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MonitorPlay className="w-5 h-5" />}
                  Review Full Production
                </button>

                {isPartStory && (
                  <div className="pt-4 space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Episodic Deliverables</label>
                      </div>
                      <button 
                        onClick={handleExportAllParts}
                        disabled={isExporting || isLoading}
                        className="text-[10px] font-black text-white hover:scale-105 active:scale-95 uppercase tracking-widest flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                      >
                        <Download size={14} className={isExporting ? "animate-bounce" : ""} />
                        Export All Segments
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                       {Array.from({ length: numParts }).map((_, i) => {
                         const pNum = i + 1;
                         const isReady = scenes.filter(s => s.partIndex === pNum).every(s => s.imageUrl && s.status.visual === 'done');
                         
                         return (
                          <motion.div 
                            key={i} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={cn(
                              "group p-4 bg-zinc-900 shadow-xl border rounded-[28px] flex items-center justify-between transition-all cursor-pointer",
                              currentPreviewPart === pNum ? "border-red-600/50 bg-red-600/5" : "border-white/5 hover:border-white/10"
                            )}
                            onClick={() => setCurrentPreviewPart(pNum)}
                          >
                             <div className="flex items-center gap-4 flex-1">
                                <div className={cn(
                                  "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg italic transition-all",
                                  currentPreviewPart === pNum ? "bg-red-600 text-white scale-110 shadow-lg shadow-red-600/30" : "bg-white/5 text-zinc-500"
                                )}>
                                  {pNum}
                                </div>
                                <div>
                                  <h4 className="text-[11px] font-black text-white uppercase tracking-tighter">SEGMENT {pNum}</h4>
                                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{isReady ? 'Production Ready' : 'In Progress'}</p>
                                </div>
                             </div>
                             
                             <div className="flex items-center gap-2">
                               {isReady && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportVideo(pNum);
                                    }}
                                    disabled={isExporting}
                                    className="w-10 h-10 bg-red-600/10 text-red-500 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white rounded-xl transition-all disabled:opacity-50"
                                  >
                                    <Download size={18} />
                                  </button>
                               )}
                             </div>
                          </motion.div>
                         );
                       })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(isLoading || statusMessage) && (
              <div className="space-y-2">
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between items-center px-1">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{statusMessage || (isLoading ? 'Creating Magic...' : '')}</p>
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{progress}%</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Viewer */}
        <div className="lg:col-span-8">
           <div className="bg-zinc-950 border border-white/5 rounded-2xl md:rounded-[40px] overflow-hidden min-h-[400px] md:min-h-[600px] flex flex-col relative">
              <div className="px-4 py-3 md:px-8 md:py-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={cn("p-1 md:p-1.5 rounded-lg bg-red-500/10")}>
                    <MonitorPlay size={12} className="text-red-500" />
                  </div>
                  <span className="text-[8px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Preview - Step: {activeStep}
                  </span>
                </div>
                {videoUrl && (
                  <button 
                    onClick={handleExportVideo}
                    disabled={isExporting}
                    className="flex items-center gap-2 text-[8px] md:text-[10px] font-black uppercase text-green-500 hover:text-green-400 transition-colors disabled:opacity-50"
                  >
                    <Download size={14} /> 
                    <span className="hidden sm:inline">
                      {isExporting ? `Exporting ${exportProgress?.progress || 0}%...` : 'Download Reel'}
                    </span>
                  </button>
                )}
              </div>
              <div className="flex-1 w-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
                  {activeStep === 'script' && (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-6 opacity-30">
                      <div className="w-20 h-20 bg-red-500/10 border-2 border-dashed border-red-500/20 rounded-full flex items-center justify-center">
                        <Sparkles className="w-10 h-10 text-red-500" />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Viral Engine Standby</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Provide a hook on the left to ignite the story</p>
                      </div>
                    </div>
                  )}

                  {activeStep === 'editor' && (
                    <div className="flex flex-col h-full gap-6 w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Professional episodic Script Editor</span>
                        </div>
                        <span className="text-[10px] font-black text-red-500 uppercase tabular-nums tracking-widest bg-red-500/10 px-3 py-1 rounded-full">
                          {fullScript.split(/\s+/).length} Words | {fullScript.length} Characters
                        </span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto space-y-12 pr-2 custom-scrollbar pb-20">
                        {Array.from({ length: isPartStory ? numParts : 1 }).map((_, pIdx) => {
                          const pNum = pIdx + 1;
                          
                          // Correctly extract the part text including its tags for context but allowing editing of the meat
                          const getPartContent = () => {
                            if (!isPartStory) return fullScript;
                            const regex = new RegExp(`\\[PART ${pNum} START\\]([\\s\\S]*?)\\[PART ${pNum} END\\]`, 'i');
                            const match = fullScript.match(regex);
                            return match ? match[1].trim() : "Segment content not found...";
                          };

                          const handlePartEdit = (newText: string) => {
                            if (!isPartStory) {
                              setFullScript(newText);
                              return;
                            }
                            const regex = new RegExp(`(\\[PART ${pNum} START\\])([\\s\\S]*?)(\\[PART ${pNum} END\\])`, 'i');
                            setFullScript(prev => prev.replace(regex, `$1\n${newText}\n$3`));
                          };
                          
                          return (
                            <motion.div 
                              key={pNum} 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: pIdx * 0.1 }}
                              className="relative group"
                            >
                              <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-red-600 to-transparent rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white text-xs font-black italic shadow-lg shadow-red-600/20">
                                      {pNum}
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">EPISODE SEGMENT {pNum}</h3>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Story flow ready</span>
                                    <CheckCircle2 size={12} className="text-green-500" />
                                  </div>
                                </div>

                                <div className="relative">
                                  <textarea 
                                    value={getPartContent()}
                                    onChange={(e) => handlePartEdit(e.target.value)}
                                    className="w-full bg-zinc-900/40 border border-white/5 rounded-[32px] p-8 text-lg md:text-xl text-zinc-300 focus:text-white leading-relaxed font-bold outline-none ring-0 focus:border-red-500/30 transition-all resize-none min-h-[300px] shadow-2xl backdrop-blur-sm"
                                    placeholder={`Write Segment ${pNum} content here...`}
                                  />
                                  <div className="absolute top-4 right-8 flex gap-2">
                                     <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">SEGMENT {pNum} MASTER BLOCK</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 px-4">
                                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center justify-center">
                                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Hook State</span>
                                    <span className="text-[9px] font-black text-red-500 uppercase italic">High Retention</span>
                                  </div>
                                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center justify-center">
                                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Body Pacing</span>
                                    <span className="text-[9px] font-black text-orange-500 uppercase italic">Fast Momentum</span>
                                  </div>
                                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center justify-center">
                                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Loop Exit</span>
                                    <span className="text-[9px] font-black text-blue-500 uppercase italic">Cliffhanger Active</span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-sm">
                        <div className="flex items-center justify-center gap-6 py-4 px-8 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
                          <button 
                            onClick={() => aiService.speak(fullScript, language)} 
                            className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-400 hover:text-white transition-all transform hover:scale-105"
                          >
                            <Volume2 size={14} className="text-red-500" /> Narrative Rehearsal
                          </button>
                          <div className="w-px h-6 bg-white/10" />
                          <button 
                            onClick={() => {
                              if(confirm("Are you sure? This will wipe the current narrative.")) {
                                setFullScript('');
                                setScenes([]);
                              }
                            }} 
                            className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-400 hover:text-red-500 transition-all transform hover:scale-105"
                          >
                            <Trash2 size={14} /> Wipe all
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 'voice' && (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                       <div className="w-full max-w-2xl space-y-12">
                          <div className="text-center space-y-2">
                             <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Episodic Neural Sync</h3>
                             <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Preview independent audio masters for each part</p>
                          </div>

                          <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {Array.from({ length: isPartStory ? numParts : 1 }).map((_, pIdx) => {
                              const pNum = pIdx + 1;
                              const pAudio = scenes.find(s => s.partIndex === pNum)?.audioUrl || audioUrl;
                              
                              return (
                                <motion.div 
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: pIdx * 0.1 }}
                                  key={pNum} 
                                  className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-6 group hover:bg-white/[0.05] transition-all"
                                >
                                  <div className="w-16 h-16 bg-red-600/10 border border-red-600/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <span className="text-xl font-black text-red-500 italic">{pNum}</span>
                                  </div>
                                  <div className="flex-1 text-center sm:text-left">
                                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-1 italic">{isPartStory ? `SEGMENT ${pNum} MASTER` : 'FULL REEL MASTER'}</h4>
                                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Neural Narration Audio</p>
                                  </div>
                                  {pAudio && pAudio !== '' && pAudio !== 'READY' ? (
                                    <div className="w-full sm:w-[240px]">
                                      <audio 
                                        src={pAudio === 'MULTI_SCENE_AUDIO' ? audioUrl : pAudio} 
                                        controls 
                                        className="w-full h-8 invert grayscale opacity-80 hover:opacity-100 transition-opacity" 
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-zinc-600">
                                      <Loader2 size={12} className="animate-spin" />
                                      <span className="text-[9px] font-black uppercase tracking-widest">Processing...</span>
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>

                          <div className="pt-6 text-center">
                            <button 
                              onClick={() => setActiveStep('visuals')}
                              className="px-12 py-5 bg-white text-black font-black uppercase tracking-tighter rounded-full hover:scale-105 active:scale-95 transition-all shadow-2xl"
                            >
                              Move to Visual Storyboarding
                            </button>
                          </div>
                       </div>
                    </div>
                  )}

                  {activeStep === 'visuals' && (
                    <div className="w-full space-y-12 pb-20">
                       <div className="flex items-center justify-between">
                         <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">EPISODIC VISUAL PRODUCTION</h3>
                         <div className="flex items-center gap-6">
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-black text-white px-2 py-0.5 bg-red-600 rounded italic">LIVE PRODUCTION</span>
                              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                {scenes.filter(s => s.imageUrl && s.status.visual === 'done').length} / {scenes.length} FRAMES
                              </span>
                            </div>
                            {scenes.some(s => s.status.visual === 'error') && (
                              <button 
                                onClick={handleRetryFailedVisuals}
                                className="flex items-center gap-2 p-2 bg-orange-500/10 text-orange-500 rounded-xl hover:bg-orange-500/20 transition-all"
                              >
                                <RefreshCw size={14} />
                              </button>
                            )}
                         </div>
                       </div>

                       <div className="space-y-16">
                         {Array.from({ length: isPartStory ? numParts : 1 }).map((_, pIdx) => {
                           const pNum = pIdx + 1;
                           const partScenes = isPartStory ? scenes.filter(s => s.partIndex === pNum) : scenes;
                           
                           return (
                             <div key={pNum} className="space-y-6">
                               <div className="flex items-center gap-4 px-1">
                                 <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                 <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic tracking-[0.3em]">EPISODIC VISUAL SEQUENCE {pNum}</span>
                                 <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                               </div>

                               <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                 {partScenes.map((scene, i) => (
                                   <motion.div 
                                     key={scene.id} 
                                     initial={{ opacity: 0, scale: 0.95 }}
                                     animate={{ opacity: 1, scale: 1 }}
                                     className="group relative aspect-[9/16] bg-zinc-900 rounded-[32px] overflow-hidden border border-white/5 hover:border-red-500/50 transition-all shadow-2xl"
                                   >
                                     {scene.imageUrl ? (
                                       <>
                                         <img 
                                           src={scene.imageUrl} 
                                           className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                                           referrerPolicy="no-referrer"
                                           crossOrigin="anonymous"
                                         />
                                         <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
                                         <div className="absolute inset-0 p-5 flex flex-col justify-end gap-3 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                            <div className="flex flex-wrap gap-1">
                                              {scene.isHook && <span className="px-2 py-0.5 bg-yellow-400 text-black text-[7px] font-black uppercase rounded-full">Hook</span>}
                                              {scene.isCliffhanger && <span className="px-2 py-0.5 bg-red-600 text-white text-[7px] font-black uppercase rounded-full">Loop</span>}
                                            </div>
                                            <span className="text-[9px] font-black text-zinc-500/50 uppercase tracking-[0.2em] italic">FRAME 0{i+1}</span>
                                            <button 
                                              onClick={() => handleRegenerateScene(scenes.findIndex(s => s.id === scene.id))}
                                              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase tracking-widest rounded-2xl backdrop-blur-xl border border-white/10 transition-all flex items-center justify-center gap-2"
                                            >
                                              <RefreshCw size={12} /> RETRY
                                            </button>
                                         </div>
                                       </>
                                     ) : (
                                       <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                                          <div className="w-12 h-12 border-2 border-red-500/10 border-t-red-500 rounded-full animate-spin" />
                                          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">IMAGING...</span>
                                       </div>
                                     )}
                                   </motion.div>
                                 ))}
                               </div>
                             </div>
                           );
                         })}
                       </div>

                       {!isLoading && (
                        <div className="flex flex-col items-center gap-6 pt-12 text-center">
                          {scenes.some(s => !s.imageUrl) ? (
                            <div className="space-y-4">
                               <button 
                                onClick={() => handleGenerateVisuals()}
                                className="px-16 py-6 bg-red-600 text-white font-black uppercase tracking-tighter rounded-full hover:scale-105 transition-all shadow-2xl active:scale-95 flex items-center gap-3"
                              >
                                Resume Visual Production <RefreshCw size={20} className="animate-spin-slow" />
                              </button>
                              <div className="flex flex-col items-center gap-1">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                  {scenes.filter(s => !s.imageUrl).length} frames pending in production
                                </p>
                                <button 
                                  onClick={handleAssembleVideo}
                                  className="text-[9px] font-black text-red-500/50 hover:text-red-500 uppercase tracking-widest underline transition-colors"
                                >
                                  Skip & Preview Anyway
                                </button>
                              </div>
                            </div>
                          ) : (
                             <motion.button 
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              onClick={handleAssembleVideo}
                              className="px-16 py-6 bg-green-600 text-white font-black uppercase tracking-tighter rounded-full hover:bg-green-500 transition-all shadow-2xl active:scale-95 flex items-center gap-3"
                            >
                              Finalize Production Master <CheckCircle2 size={20} />
                            </motion.button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {activeStep === 'video' && (
                    <div className="w-full">
                       {videoUrl ? (
                         <div className="w-full h-full flex flex-col items-center">
                            <ProductionPlayer 
                              key={isPartStory ? `preview-segment-${currentPreviewPart}` : 'preview-full-master'}
                              scenes={isPartStory ? scenes.filter(s => s.partIndex === currentPreviewPart) : scenes}
                              audioUrl={isPartStory ? (scenes.find(s => s.partIndex === currentPreviewPart)?.audioUrl || audioUrl) : audioUrl}
                              title={isPartStory ? `${topic} - Segment ${currentPreviewPart}` : topic}
                              aspectRatio="reel"
                              numParts={isPartStory ? numParts : 1}
                              onDownload={() => handleExportVideo(isPartStory ? currentPreviewPart : undefined)}
                            />
                            <div className="mt-12 flex flex-col sm:flex-row gap-4">
                               <button 
                                 onClick={() => handleExportVideo(isPartStory ? currentPreviewPart : undefined)}
                                 disabled={isExporting}
                                 className="px-10 py-5 bg-red-600 text-white font-black uppercase tracking-tighter rounded-full hover:bg-red-500 transition-all flex items-center gap-3 shadow-2xl shadow-red-600/20 active:scale-95 disabled:opacity-50"
                               >
                                 <Download size={20} /> {isPartStory ? `Export Segment ${currentPreviewPart}` : 'Export Master Reel'}
                               </button>
                               <button
                                 onClick={() => setActiveStep('script')}
                                 className="px-10 py-5 bg-white/5 border border-white/10 text-white font-black uppercase tracking-tighter rounded-full hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                               >
                                  Remix Story
                               </button>
                            </div>
                         </div>
                       ) : (
                        <div className="aspect-[9/16] max-w-[360px] mx-auto bg-black flex flex-col items-center justify-center p-12 text-center space-y-6 rounded-3xl border border-white/10">
                          <div className="relative">
                            <div className="w-20 h-20 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Smartphone size={28} className="text-red-500 animate-pulse" />
                            </div>
                          </div>
                          <div className="space-y-2">
                             <p className="text-white font-black uppercase tracking-tighter italic text-lg leading-tight">{statusMessage || 'Compiling Master...'}</p>
                             <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden mx-auto">
                                <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                             </div>
                             <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">{progress}% Finalizing</p>
                          </div>
                        </div>
                       )}
                    </div>
                  )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function Placeholder({ icon: Icon, text }: { icon: any, text: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-4 opacity-20 py-20 uppercase tracking-widest">
      <Icon className="w-12 h-12 text-zinc-600" />
      <p className="text-[10px] font-black max-w-[200px]">{text}</p>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
