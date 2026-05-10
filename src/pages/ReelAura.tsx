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
  Plus
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
  const [partLength, setPartLength] = useState(60); // Seconds
  
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

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);


  const isProjectLoading = useRef(true);

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
  }, [scenes, activeStep, fullScript, topic, voice, theme, isPartStory, numParts, partLength, audioUrl]);
  
  useEffect(() => {
    return () => aiService.stopSpeaking();
  }, []);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  const handleExportVideo = async (targetPartIndex?: number) => {
    if (scenes.length === 0) return;
    
    setIsExporting(true);
    const statusLabel = targetPartIndex ? `Finalizing Part ${targetPartIndex}...` : 'Finalizing Full Reel Master...';
    setExportProgress({ progress: 0, status: statusLabel });
    
    try {
      const workingScenes = targetPartIndex 
        ? scenes.filter(s => s.partIndex === targetPartIndex)
        : scenes;

      if (workingScenes.length === 0) throw new Error("No scenes found for this part.");

      // Check if scenes have individual audio or we need to use a master chunk
      const firstAudio = workingScenes[0].audioUrl;
      const effectiveAudioUrl = (firstAudio && firstAudio !== 'MULTI_SCENE_AUDIO') ? firstAudio : audioUrl;

      const videoBlob = await exportToVideo(workingScenes, effectiveAudioUrl, {
        aspectRatio: 'reel',
        onProgress: (p) => setExportProgress(p)
      });
      
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      const filename = targetPartIndex 
        ? `Auurio_Reel_Part${targetPartIndex}_${Date.now()}.webm`
        : `Auurio_Full_Reel_${Date.now()}.webm`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      await creditService.deduct(profile.uid, CREDIT_COSTS.VIDEO_PRODUCTION, 'REEL_EXPORT');
    } catch (err: any) {
      console.error("Reel Export error:", err);
      setError("Export failed: " + err.message);
    } finally {
      setIsExporting(false);
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

      const totalSeconds = isPartStory ? numParts * partLength : length * 60;
      const frameCount = Math.max(12, Math.ceil(totalSeconds / 6)); // Increased pacing for Reels
      
      const prompt = `ACT AS A VIRAL CONTENT ARCHITECT & SHORT-FORM RETENTION MASTER.
      Write an ultra-high-energy, fast-paced viral script in ${language} about: ${topic}.
      
      CORE STRATEGY:
      - Use ultra-short, punchy sentences.
      - Eliminate fluff. Every word must grab attention.
      - Optimize for vertical storytelling with extreme retention hooks.
      
      STRUCTURE:
      ${isPartStory ? `YOU MUST DIVIDE THIS INTO EXACTLY ${numParts} PARTS.
      EACH PART MUST BE A COMPLETE STORY ARC BUT END WITH A MASSIVE CLIFFHANGER.
      THE DURATION PER PART IS ROUGHLY ${partLength} SECONDS.
      
      TEMPLATE PER PART:
      [PART X START]
      [HOOK] (A mind-blowing, pattern-interrupt sentence to stop the scroll) [/HOOK]
      [NARRATION] (The core high-energy revelations. At least 8-10 long sentences per part to fill the requested duration.) [/NARRATION]
      [CLIFFHANGER] (A suspenseful "open loop" that makes them search for Part X+1) [/CLIFFHANGER]
      [PART X END]` : `One single continuous viral script with a strong hook at the 0.5s mark. Total duration: ${totalSeconds} seconds.`}

      OUTPUT FORMAT:
      [NARRATIVE]
      ${isPartStory ? `(ALL ${numParts} part blocks here in order)` : `(One master script block)`}
      [/NARRATIVE]

      [VISUALS]
      1. [VISUAL] High-impact vertical motion prompt 1
      2. [VISUAL] High-impact vertical motion prompt 2
      ... (provide at least one high-impact prompt per 6-8 seconds of story)
      [/VISUALS]

      CRITICAL: Ensure [PART] markers are mathematically precise. Don't skip numbers. Content must be LONG enough to fill the requested ${partLength}s per part.`;

      const generatedContent = await aiService.generateText(prompt, undefined, (status) => setStatusMessage(status));
      setFullScript(generatedContent);
      
      const narrativeMatch = generatedContent.match(/\[NARRATIVE\]([\s\S]*?)\[\/NARRATIVE\]/i);
      const visualsBlock = generatedContent.match(/\[VISUALS\]([\s\S]*?)\[\/VISUALS\]/i);
      
      let finalNarration = "";
      let finalVisuals: string[] = [];

      if (!narrativeMatch) {
         finalNarration = generatedContent.split('[VISUALS]')[0].replace('[NARRATIVE]', '').trim();
         const visualsPart = (generatedContent.split('[VISUALS]')[1] || '').replace('[/VISUALS]', '');
         finalVisuals = visualsPart.split(/\[VISUAL\]/i).map(p => p.trim()).filter(p => p.length > 5);
      } else {
        finalNarration = narrativeMatch[1].trim();
        finalVisuals = (visualsBlock ? visualsBlock[1] : '').split(/\[VISUAL\]/i).map(p => p.trim()).filter(p => p.length > 5);
      }

      processGeneratedContent(finalNarration, finalVisuals, frameCount);
      
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
        scenes: processGeneratedContent(finalNarration, finalVisuals, frameCount, true),
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
      setActiveStep('editor');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const partitionScript = (text: string, visuals: string[], frameCount: number): Scene[] => {
    let parsedScenes: Scene[] = [];
    
    if (isPartStory) {
      // Robust regex to find Parts and then split them into scenes
      const partRegex = /\[PART (\d+) START\]([\s\S]*?)\[PART \1 END\]/gi;
      const matches = Array.from(text.matchAll(partRegex));
      
      if (matches.length > 0) {
        matches.forEach((m, pIdx) => {
          const rawContent = m[2].trim();
          const cleanText = rawContent
            .replace(/\[HOOK\]|\[\/HOOK\]|\[NARRATION\]|\[\/NARRATION\]|\[CLIFFHANGER\]|\[\/CLIFFHANGER\]/gi, '')
            .trim();
          
          if (!cleanText) return;

          // Goal: Distribute scenes evenly across parts
          const scenesPerPart = Math.max(4, Math.ceil(frameCount / matches.length));
          const segmentLen = Math.ceil(cleanText.length / scenesPerPart);
          
          for (let i = 0; i < scenesPerPart; i++) {
            const start = i * segmentLen;
            const end = (i + 1) * segmentLen;
            const textSegment = cleanText.substring(start, end).trim();
            if (textSegment.length < 3) continue;

            parsedScenes.push({
              id: Math.random().toString(36).substr(2, 9),
              partIndex: pIdx + 1,
              visualPrompt: visuals[parsedScenes.length] || `Viral Reel scene ${parsedScenes.length + 1}: ${topic.substring(0, 20)}...`,
              narration: textSegment,
              imageUrl: '',
              status: { story: 'done', voice: 'pending', visual: 'pending' }
            });
          }
        });
      }
    }

    // Fallback if not part story or parsing failed
    if (parsedScenes.length === 0) {
      const targetFrames = Math.max(visuals.length, frameCount);
      const charsPerSegment = Math.max(1, Math.floor(text.length / targetFrames));
      
      parsedScenes = Array.from({ length: targetFrames }).map((_, index) => {
        const start = index * charsPerSegment;
        let end = (index + 1) * charsPerSegment;
        if (index === targetFrames - 1) end = text.length;
        
        return {
          id: Math.random().toString(36).substr(2, 9),
          partIndex: 1,
          visualPrompt: visuals[index] || `Vertical high impact cinematic frame ${index + 1}`,
          narration: text.substring(start, end).trim() || "Captivating moment...",
          imageUrl: '',
          status: { story: 'done', voice: 'pending', visual: 'pending' }
        };
      });
    }

    return parsedScenes;
  };

  const processGeneratedContent = (fullNarration: string, visualPrompts: string[], frameCount: number, returnOnly = false) => {
    const parsedScenes = partitionScript(fullNarration, visualPrompts, frameCount);

    if (returnOnly) return parsedScenes;

    setScenes(parsedScenes);
    setImages(parsedScenes.map(s => s.imageUrl));
    setFullScript(fullNarration);
  };

  const handleConfirmScript = () => {
    // Determine target number of frames based on high-paced Reels logic
    const estimatedSeconds = fullScript.length / 14; 
    const totalSeconds = isPartStory ? (numParts * partLength) : Math.max(length * 60, estimatedSeconds);
    const targetFrames = Math.max(12, Math.ceil(totalSeconds / 6));
    
    console.log(`Auurio: Re-partitioning Reel into ${targetFrames} frames...`);

    const currentVisuals = scenes.map(s => s.visualPrompt);
    const updatedScenes = partitionScript(fullScript, currentVisuals, targetFrames);
    
    // Preserve any existing images/status where possible
    const finalizedScenes = updatedScenes.map((ns, idx) => {
      const existing = scenes[idx];
      if (existing && existing.narration === ns.narration) {
        return existing;
      }
      return ns;
    });

    setScenes(finalizedScenes);
    setActiveStep('voice');
  };

  const handleGenerateVoice = async () => {
    if (scenes.length === 0) return;
    setIsLoading(true);
    setProgress(0);
    setError(null);
    setAudioUrl("");

    try {
      const hasCredits = await creditService.checkBalance(profile.uid, CREDIT_COSTS.AUDIO_CONVERSION);
      if (!hasCredits) throw new Error('Insufficient credits.');

      setStatusMessage("EPISODIC SYNTHESIS: High-Impact Neural Narrator mastering by parts...");
      
      if (!fullScript || fullScript.length < 10) {
        throw new Error("Viral script is missing or too short. Please refine in the editor.");
      }

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
            .replace(/\[HOOK\]|\[\/HOOK\]|\[NARRATION\]|\[\/NARRATION\]|\[CLIFFHANGER\]|\[\/CLIFFHANGER\]/gi, '')
            .trim();
          
          if (!cleanPartText) continue;

          setStatusMessage(`Synthesizing Part ${partIdx}/${partMatches.length}...`);
          const res = await aiService.generateAudio(cleanPartText, voice, language, {
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

        if (partAudios.length === 0) throw new Error("Voice synthesis failure for parts.");

        // Assign part-specific audio to scenes
        setScenes(prev => prev.map(s => {
          const partAudio = partAudios.find(pa => pa.index === s.partIndex);
          if (partAudio) {
            // Count scenes in this part to distribute duration
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

        // For the main player, we'll use the first part's audio as a placeholder or we might need to handle multi-audio player
        setAudioUrl(partAudios[0].url);

      } else {
        // Single cohesive story synthesis
        const cleanScript = fullScript.replace(/\[PART \d+ START\]|\[PART \d+ END\]|\[NARRATION\]|\[\/NARRATION\]|\[HOOK\]|\[\/HOOK\]|\[CLIFFHANGER\]|\[\/CLIFFHANGER\]/gi, '').trim();
        const res = await aiService.generateAudio(cleanScript, voice, language, {
          onProgress: (p) => setProgress(p)
        });
        
        if (!res.url) throw new Error("Voice synthesis failure.");
        setAudioUrl(res.url);

        const audio = new Audio(res.url);
        const totalDuration = await new Promise<number>((resolve) => {
          audio.onloadedmetadata = () => resolve(audio.duration);
          setTimeout(() => resolve(fullScript.length * 0.1), 5000);
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
      setStatusMessage('Part-wise Audio Mastered!');
      setTimeout(() => setActiveStep('visuals'), 500);
    } catch (err: any) {
      console.error("Episodic synthesis error:", err);
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
    const workingScenes = Array.isArray(passedScenes) ? passedScenes : scenes;
    if (workingScenes.length === 0) return;

    // Fast transition if all workingScenes already have images
    const hasAnyMissing = workingScenes.some(s => !s.imageUrl || s.status.visual !== 'done');
    if (!hasAnyMissing) {
      setStatusMessage('Storyboard already perfected! Starting Production...');
      setProgress(100);
      setTimeout(() => {
        setIsLoading(false);
        handleAssembleVideo();
        setStatusMessage('');
      }, 500);
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setError("");
    setStatusMessage('Mastering visual aesthetic engine...');
    try {
      const hasCredits = await creditService.checkBalance(profile.uid, CREDIT_COSTS.IMAGE_GENERATION);
      if (!hasCredits) throw new Error('Insufficient credits.');

      const totalScenes = workingScenes.length;
      let completedCount = workingScenes.filter(s => s.imageUrl && s.status.visual === 'done').length;

      // Controlled parallelism (Concurrency 5) for Reels to ensure high-speed but stable production
      const CONCURRENCY = 5;
      for (let i = 0; i < totalScenes; i += CONCURRENCY) {
        const batch = workingScenes.slice(i, i + CONCURRENCY);
        const batchIndices = Array.from({ length: batch.length }, (_, k) => i + k);

        await Promise.all(batch.map(async (scene, batchIdx) => {
          const index = batchIndices[batchIdx];
          
          if (scene.imageUrl && scene.status.visual === 'done') {
            return;
          }

          setScenes(prev => {
            const next = [...prev];
            next[index] = { ...next[index], status: { ...next[index].status, visual: 'processing' } };
            return next;
          });

          try {
            const url = await generateSingleSceneImage(scene);
            
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

            completedCount++;
            setProgress(Math.floor((completedCount / totalScenes) * 100));
          } catch (err) {
            console.error(`Failed to generate Reel frame ${index}:`, err);
            setScenes(prev => {
              const next = [...prev];
              next[index] = { ...next[index], status: { ...next[index].status, visual: 'error' } };
              return next;
            });
          }
        }));
        
        if (i + CONCURRENCY < totalScenes) {
          await new Promise(r => setTimeout(r, 600));
        }
      }

      await creditService.deduct(profile.uid, CREDIT_COSTS.IMAGE_GENERATION, 'VISUAL_GENERATION');
      
      // MANDATORY RESCUE PASS: Identity and heal any missing frames before finishing
      setStatusMessage('Final visual sync & verification...');
      let rescuePasses = 0;
      const MAX_RESCUE_PASSES = 3;
      
      while (rescuePasses < MAX_RESCUE_PASSES) {
        // Check for missing images using a functional update to get freshest current state
        let currentStatusScenes: Scene[] = [];
        await new Promise<void>(resolve => {
          setScenes(s => { currentStatusScenes = s; resolve(); return s; });
        });

        const failedIndices = currentStatusScenes
          .map((s, idx) => (!s.imageUrl || s.status.visual !== 'done') ? idx : -1)
          .filter(idx => idx !== -1);
          
        if (failedIndices.length === 0) break;
        
        rescuePasses++;
        setStatusMessage(`ReelRescue: Repairing ${failedIndices.length} frames (Pass ${rescuePasses})...`);
        
        // Parallelized Rescue for vertical speed
        await Promise.all(failedIndices.map(async (idx) => {
          try {
            const sceneData = currentStatusScenes[idx];
            const url = await generateSingleSceneImage(sceneData);
            setScenes(prev => {
              const next = [...prev];
              next[idx] = { ...next[idx], imageUrl: url, status: { ...next[idx].status, visual: 'done' } };
              return next;
            });
            completedCount++;
            setProgress(Math.floor((completedCount / Math.max(totalScenes, completedCount)) * 100));
          } catch (e) {
            console.error(`Rescue attempt ${rescuePasses} failed for ${idx}`, e);
          }
        }));
      }

      // Final Check
      const trulyFinalScenes = await new Promise<Scene[]>(resolve => {
        setScenes(s => { resolve(s); return s; });
      });
      const finalMissing = trulyFinalScenes.some(s => !s.imageUrl);

      if (!finalMissing) {
        setStatusMessage('Storyboard Perfected!');
        setProgress(100);
        
        // Update project status in DB so resume logic handles it correctly
        try {
          await saveProjectState({ 
            scenes: trulyFinalScenes,
            status: 'ready', 
            progress: 100,
            activeStep: 'video' 
          });
        } catch (e) {
          console.warn("Reel DB update failure", e);
        }

        setTimeout(() => {
          setIsLoading(false);
          handleAssembleVideo();
          setStatusMessage('');
        }, 800);
      } else {
        setIsLoading(false);
        setStatusMessage('Reel ready with some failed frames. Please retry manually.');
      }
    } catch (err: any) {
      console.error("Reel Generator Error:", err);
      setError(err.message);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        if (statusMessage === 'Storyboard Perfected!') setStatusMessage('');
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
    const reelKeywords = "social media aesthetic, vertical 9:16 composition, high impact, trend-forward, vibrant, sharp focus, 8k resolution.";
    
    if (theme === 'Realistic') {
      styleModifiers = `${reelKeywords} photorealistic smartphone photography, golden hour glow, portrait lighting, close-up details.`;
    } else if (theme === 'Anime') {
      styleModifiers = `${reelKeywords} vivid anime illustration, dynamic vertical composition, glowing atmosphere, clean lines.`;
    } else {
      styleModifiers = `${reelKeywords} cinematic vertical visual, high contrast, artistic 9:1layout, energetic flow.`;
    }

    const prompt = `Vertical Reel: ${visualPart}. Aesthetic: ${styleModifiers}`;
    const negativePrompt = "landscape, horizontal, black bars, frame, border, low resolution, blurry, distorted features.";
    
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
        "Analyzing 7s high-impact visual sync...",
        "Applying viral color grading...",
        "Arranging vertical storyboard assets...",
        "Mixing high-energy soundscapes...",
        "Finalizing mobile-optmized render..."
      ];

      for (let i = 0; i < stepsList.length; i++) {
        setStatusMessage(stepsList[i]);
        const stepDuration = 1500; // ms per step
        const ticks = 15;
        const tickMs = stepDuration / ticks;
        
        for (let t = 0; t < ticks; t++) {
          const stepProgress = Math.floor((t / ticks) * 20);
          const totalProgress = (i * 20) + stepProgress;
          setProgress(totalProgress);
          
          if (t === 7 && currentPid) {
             await updateDoc(doc(db, 'projects', currentPid), { progress: totalProgress });
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
                  setTimeout(() => setStatusMessage(''), 2000);
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
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-2 md:p-3 bg-red-500/20 rounded-xl md:rounded-2xl">
              <Video className="w-6 h-6 md:w-8 md:h-8 text-red-500" />
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase italic line-clamp-1">ReelAura</h1>
          </div>
          <p className="text-xs md:text-sm text-zinc-500 font-medium max-w-xl">
            High-impact vertical content machine. Build viral Reels and Shorts in minutes.
          </p>
        </div>
      </div>

      {/* Progress Path */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 custom-scrollbar scrollbar-hide">
        {steps.map((s, idx) => {
          const StepIcon = s.icon;
          const isActive = activeStep === s.id;
          const isDone = steps.findIndex(x => x.id === activeStep) > idx;

          return (
            <div key={s.id} className="flex items-center gap-2 md:gap-3 shrink-0">
              <button 
                disabled={!isDone && !isActive}
                onClick={() => setActiveStep(s.id as Step)}
                className={cn(
                  "flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all min-w-[120px] md:min-w-0",
                  isActive ? "bg-zinc-900 border-white/20 ring-2 ring-red-500/20" : isDone ? "bg-zinc-900/50 border-white/5 opacity-80" : "bg-black/20 border-white/5 opacity-30 cursor-not-allowed"
                )}
              >
                <div className={cn("p-1.5 md:p-2 rounded-lg md:rounded-xl shrink-0", s.bg, s.color)}>
                  <StepIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-zinc-600 truncate">STG {idx + 1}</p>
                  <p className={cn("text-[10px] md:text-xs font-black uppercase tracking-tighter truncate", isActive ? "text-white" : "text-zinc-500")}>{s.label}</p>
                </div>
              </button>
              {idx < 3 && <ChevronRight size={14} className="text-zinc-800 shrink-0" />}
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
                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">Sec / Part</label>
                        <input 
                          type="number" min="15" max="60" value={partLength || 15} 
                          onChange={(e) => setPartLength(parseInt(e.target.value))}
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">Total Duration (Min)</label>
                      <input 
                        type="range" min="1" max="10" step="1" value={length || 1} 
                        onChange={(e) => setLength(parseInt(e.target.value))}
                        className="w-full accent-red-500"
                      />
                      <div className="flex justify-between text-[9px] font-bold text-zinc-500">
                        <span>1 MIN</span>
                        <span className="text-white">{length} MIN</span>
                        <span>10 MIN</span>
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
              <div className="space-y-4">
                <button 
                  onClick={() => handleAssembleVideo()}
                  disabled={isLoading}
                  className="w-full py-4 bg-green-500 text-black font-bold uppercase tracking-tighter flex items-center justify-center gap-2 rounded-2xl hover:bg-green-400 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  Review Full Production
                </button>

                {isPartStory && (
                  <div className="pt-2 space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Episodic Downloads</label>
                    <div className="grid grid-cols-1 gap-2">
                       {Array.from({ length: numParts }).map((_, i) => (
                         <div key={i} className="group p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between hover:bg-white/10 transition-all">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 font-black text-xs italic">
                                 {i + 1}
                               </div>
                               <div>
                                 <h4 className="text-[10px] font-black text-white uppercase tracking-tighter">PART {i + 1}</h4>
                                 <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Independent Reel Master</p>
                               </div>
                            </div>
                            <button 
                              onClick={() => handleExportVideo(i + 1)}
                              disabled={isExporting}
                              className="p-2 bg-green-500/20 text-green-500 group-hover:bg-green-500 group-hover:text-black rounded-lg transition-all disabled:opacity-50"
                            >
                              <Download size={14} />
                            </button>
                         </div>
                       ))}
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
                    <div className="flex flex-col h-full gap-4 w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">REEL SCRIPT MASTER</span>
                        </div>
                        <span className="text-[10px] font-black text-red-500/50 uppercase tabular-nums tracking-widest">
                          {fullScript.length} Characters | Viral High-Impact
                        </span>
                      </div>
                      <textarea 
                        value={fullScript}
                        onChange={(e) => setFullScript(e.target.value)}
                        className="flex-1 w-full bg-black/40 border border-white/5 rounded-3xl p-8 text-xl md:text-2xl text-zinc-200 focus:text-white leading-relaxed font-bold outline-none focus:border-red-500/20 transition-all resize-none custom-scrollbar shadow-inner"
                        placeholder="Refine your viral hook and story here..."
                      />
                      <div className="flex items-center justify-center gap-6 py-2 bg-black/20 border border-white/5 rounded-2xl">
                        <button onClick={() => aiService.speak(fullScript, language)} className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors">
                          <Volume2 size={14} /> Rehearsal Audio
                        </button>
                        <div className="w-px h-4 bg-zinc-800" />
                        <button onClick={() => setFullScript('')} className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 hover:text-red-500 transition-colors">
                          <Trash2 size={14} /> Wipe Script
                        </button>
                      </div>
                    </div>
                  )}

                  {activeStep === 'voice' && (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                       <div className="w-full max-w-sm space-y-8 text-center">
                         {audioUrl ? (
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-6">
                              <div className="w-32 h-32 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center mx-auto relative group">
                                 <div className="absolute inset-0 bg-orange-500/5 animate-ping rounded-full" />
                                 <Volume2 className="w-12 h-12 text-orange-500 group-hover:scale-110 transition-transform" />
                              </div>
                              <div className="space-y-1">
                                <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Audio Synchronized</h3>
                                <p className="text-xs text-zinc-500 font-medium">Narrative audio is ready for visual pairing</p>
                              </div>
                              {(audioUrl && audioUrl !== 'READY' && audioUrl !== 'MULTI_SCENE_AUDIO' && audioUrl !== '') ? (
                                <audio 
                                  key={audioUrl}
                                  controls 
                                  src={audioUrl}
                                  className="w-full custom-audio brightness-110"
                                />
                              ) : (
                                <div className="w-full p-4 bg-zinc-800/50 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-2">
                                   <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                     <Volume2 size={20} className="text-red-400 animate-pulse" />
                                   </div>
                                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">
                                     {audioUrl === 'READY' ? 'Synthesized but no preview available' : 'Audio is being synchronized...'}
                                   </p>
                                </div>
                              )}
                              <button 
                                onClick={() => setActiveStep('visuals')}
                                className="w-full py-4 bg-zinc-900 border border-white/10 text-white font-black uppercase tracking-tighter rounded-2xl hover:bg-zinc-800"
                              >
                                Move to Frame Generation
                              </button>
                            </motion.div>
                         ) : <Placeholder icon={Mic} text="Synthesized narration will appear here" />}
                       </div>
                    </div>
                  )}

                  {activeStep === 'visuals' && (
                    <div className="w-full space-y-6">
                       <div className="flex items-center justify-between px-1">
                         <h3 className="text-xs font-black text-white uppercase tracking-widest italic">Visual Storyboard</h3>
                         <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                              {scenes.filter(s => s.imageUrl && s.status.visual === 'done').length} / {scenes.length} Frames
                            </span>
                            {scenes.some(s => s.status.visual === 'error') && (
                              <button 
                                onClick={handleRetryFailedVisuals}
                                disabled={isLoading}
                                className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:text-orange-400 transition-colors flex items-center gap-1.5"
                              >
                                <RefreshCw size={10} className={isLoading ? "animate-spin" : ""} />
                                Retry Failed
                              </button>
                            )}
                          </div>
                       </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                         {scenes.length > 0 ? scenes.map((scene, i) => (
                           <motion.div 
                             key={scene.id} 
                             initial={{ opacity: 0, scale: 0.9 }}
                             animate={{ opacity: 1, scale: 1 }}
                             transition={{ delay: i * 0.1 }}
                             className="aspect-[9/16] bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 group relative"
                           >
                              {scene.imageUrl ? (
                                <>
                                  <img 
                                    src={scene.imageUrl} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                                    referrerPolicy="no-referrer" 
                                    crossOrigin="anonymous"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      if (target.src.includes('fallback=true')) {
                                        target.src = aiService.generateImageUrl("Vertical cinematic social media professional masterpiece photography", 1024, 1792) + '&safety=final';
                                      } else if (!target.src.includes('safety=final')) {
                                        target.src = aiService.generateImageUrl(scene.visualPrompt, 1024, 1792) + '&fallback=true';
                                      }
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 gap-2">
                                    <span className="text-[10px] font-black text-white uppercase italic tracking-widest">Frame 0{i+1}</span>
                                    <button 
                                      onClick={() => handleRegenerateScene(i)}
                                      disabled={isLoading}
                                      className="w-full py-2 bg-white/20 hover:bg-white/40 rounded-xl text-white backdrop-blur-md transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase"
                                    >
                                      <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                                      Retry
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/50">
                                   {scene.status.visual === 'error' ? (
                                     <span className="text-[8px] font-black text-red-500 uppercase tracking-widest text-center">Failed</span>
                                   ) : (
                                     <>
                                        <Loader2 size={24} className="text-red-500 animate-spin mb-2" />
                                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center">Capturing...</span>
                                     </>
                                   )}
                                </div>
                              )}
                              
                              {scene.imageUrl && watermark.enabled && (
                                 <div 
                                  className={cn(
                                    "absolute pointer-events-none select-none px-4 py-2 drop-shadow-xl flex items-center justify-center",
                                    watermark.position === 'top-left' && "top-0 left-0",
                                    watermark.position === 'top-right' && "top-0 right-0",
                                    watermark.position === 'bottom-left' && "bottom-0 left-0",
                                    watermark.position === 'bottom-right' && "bottom-0 right-0",
                                    watermark.position === 'center' && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                                    watermark.position === 'bottom-center' && "bottom-0 left-1/2 -translate-x-1/2",
                                  )}
                                  style={{ opacity: watermark.opacity }}
                                >
                               </div>
                              )}
                           </motion.div>
                         )) : Array(scenes.length || 8).fill(0).map((_, i) => (
                            <div key={i} className="aspect-[9/16] bg-zinc-900/50 border border-white/10 border-dashed rounded-2xl flex items-center justify-center">
                               <ImageIcon className="w-6 h-6 text-zinc-800" />
                            </div>
                         ))}
                        </div>
                        {scenes.some(s => s.imageUrl) && !isLoading && (
                         <motion.button 
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           onClick={handleAssembleVideo}
                           className="w-full py-4 bg-blue-500 text-white font-black uppercase tracking-tighter rounded-2xl flex items-center justify-center gap-2"
                         >
                           Proceed to Video Assembly <ChevronRight size={18} />
                         </motion.button>
                       )}
                    </div>
                  )}

                  {activeStep === 'video' && (
                    <div className="w-full">
                       {videoUrl ? (
                         <div className="w-full h-full flex flex-col items-center">
                            <ProductionPlayer 
                              scenes={scenes}
                              audioUrl={audioUrl}
                              title={topic}
                              aspectRatio="reel"
                              numParts={isPartStory ? numParts : 1}
                              onDownload={() => handleExportVideo()}
                            />
                            <div className="mt-12 flex flex-col sm:flex-row gap-4">
                               <button 
                                 onClick={() => window.open(audioUrl, '_blank')}
                                 className="px-10 py-5 bg-red-600 text-white font-black uppercase tracking-tighter rounded-full hover:bg-red-500 transition-all flex items-center gap-3 shadow-2xl shadow-red-600/20 active:scale-95"
                               >
                                 <Download size={20} /> Export Master Reel
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
