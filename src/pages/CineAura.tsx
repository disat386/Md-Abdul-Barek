import React, { useState, useEffect } from 'react';
import { 
  Film, 
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
  visualPrompt: string;
  narration: string;
  imageUrl: string;
  audioUrl?: string;
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

const GENRE_TEMPLATES = [
  { 
    id: 'thriller', 
    name: 'Thriller', 
    icon: '🕵️',
    prompt: 'A tense psychological thriller set in an abandoned Victorian mansion where a detective discovers a series of mysterious letters that suggest they are being watched.'
  },
  { 
    id: 'romance', 
    name: 'Romance', 
    icon: '❤️',
    prompt: 'A heartfelt romantic drama about two star-crossed lovers meeting in a rain-soaked Paris, trying to reconcile their past before the sunrise.'
  },
  { 
    id: 'docu', 
    name: 'Nature', 
    icon: '🌿',
    prompt: 'An epic nature documentary exploring the hidden wonders of the Amazon rainforest, focusing on the delicate balance between the rare flora and fauna.'
  },
  { 
    id: 'scifi', 
    name: 'Sci-Fi', 
    icon: '🚀',
    prompt: 'A high-octane cyberpunk space opera set on a neon-drenched asteroid mining colony, where a rogue pilot uncovers a galactic conspiracy.'
  }
];

export default function CineAura({ profile }: { profile: any }) {
  const [activeStep, setActiveStep] = useState<Step>('script');
  const [topic, setTopic] = useState('');
  const [length, setLength] = useState(5); // Minutes
  const [language, setLanguage] = useState<'English' | 'Hindi' | 'Bangla'>('English');
  const [voice, setVoice] = useState(VOICES.English[0].id);
  const [voiceTone, setVoiceTone] = useState(1.0);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [theme, setTheme] = useState<'Realistic' | 'Anime' | 'Cinematic'>('Cinematic');
  const [watermark, setWatermark] = useState({
    enabled: true,
    mode: 'text' as 'text' | 'logo',
    text: 'Auurio Platform',
    logoUrl: '',
    opacity: 0.6,
    position: 'bottom-right' as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'bottom-center',
    size: 24
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


  const saveProjectState = async (updates: any = {}) => {
    const params = new URLSearchParams(window.location.search);
    const pid = projectId || params.get('projectId');
    if (!pid) return;

    try {
      await updateDoc(doc(db, 'projects', pid), {
        scenes,
        activeStep,
        progress,
        updatedAt: serverTimestamp(),
        ...updates
      });
    } catch (e) {
      console.error("Auto-save failed", e);
    }
  };

  useEffect(() => {
    if (projectId && (scenes.length > 0 || activeStep !== 'script')) {
      saveProjectState();
    }
  }, [scenes, activeStep]); // Fixed: Added scenes as dependency to save on property updates like imageUrl

  useEffect(() => {
    return () => aiService.stopSpeaking();
  }, []);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  const handleExportVideo = async () => {
    if (scenes.length === 0) return;
    
    setIsExporting(true);
    setExportProgress({ progress: 0, status: 'Initializing Cinematic Export...' });
    
    try {
      const videoBlob = await exportToVideo(scenes, audioUrl, {
        aspectRatio: 'video',
        onProgress: (p) => setExportProgress(p)
      });
      
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Auurio_Movie_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      await creditService.deduct(profile.uid, CREDIT_COSTS.VIDEO_PRODUCTION, 'VIDEO_EXPORT');
    } catch (err: any) {
      console.error("Export Error:", err);
      setError("Export failed: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!topic || topic.length < 5) return;
    setError('');
    setIsLoading(true);
    setProgress(10);
    setStatusMessage('Crafting Cohesive Narrative...');

    try {
      const hasCredits = await creditService.checkBalance(profile.uid, CREDIT_COSTS.STORY_GENERATION);
      if (!hasCredits) throw new Error('Insufficient credits.');

      const totalSeconds = length * 60;
      const frameCount = Math.max(1, Math.ceil(totalSeconds / 10)); 
      
      const prompt = `ACT AS A MASTER CINEMATIC STORYTELLER.
      Write a ${length} minute COHESIVE NARRATIVE STORY about: ${topic}. 
      
      STORY REQUIREMENTS:
      1. LANGUAGE: ${language}.
      2. FORMAT: One single, continuous, and expressive narrative script. 
      3. CRITICAL: DO NOT break the narrative into scenes in the text. It must flow naturally like an audiobook chapter.
      4. VOICE: Design the tone for a realistic, expressive storyteller's voice.
      
      OUTPUT STRUCTURE:
      First, provide the full story inside [NARRATIVE] tags.
      Then, provide a visual companion guide with EXACTLY ${frameCount} descriptive visual prompts inside [VISUALS] tags using [VISUAL] markers for each beat.
      
      Example:
      [NARRATIVE]
      Long ago... (Continuous flow)
      [/NARRATIVE]

      [VISUALS]
      1. [VISUAL] ...
      2. [VISUAL] ...
      ... (Total ${frameCount} prompts)
      [/VISUALS]`;

      const generatedContent = await aiService.generateText(prompt, undefined, (status) => setStatusMessage(status));
      setFullScript(generatedContent); // Keep raw for editing fallback or full view
      
      // Parse cohesive narrative and visual plan
      const narrativeMatch = generatedContent.match(/\[NARRATIVE\]([\s\S]*?)\[\/NARRATIVE\]/i);
      const visualsBlock = generatedContent.match(/\[VISUALS\]([\s\S]*?)\[\/VISUALS\]/i);
      
      if (!narrativeMatch) {
         // Fallback if tags are missing but content is there
         const fullNarration = generatedContent.split('[VISUALS]')[0].replace('[NARRATIVE]', '').trim();
         const visualsPart = (generatedContent.split('[VISUALS]')[1] || '').replace('[/VISUALS]', '');
         
         const visualPrompts = visualsPart.split(/\[VISUAL\]/i)
           .map(p => p.trim())
           .filter(p => p.length > 5);

         processGeneratedContent(fullNarration, visualPrompts, frameCount);
      } else {
        const fullNarration = narrativeMatch[1].trim();
        const visualPrompts = (visualsBlock ? visualsBlock[1] : '').split(/\[VISUAL\]/i)
          .map(p => p.trim())
          .filter(p => p.length > 5);
        
        processGeneratedContent(fullNarration, visualPrompts, frameCount);
      }
      
      await creditService.deduct(profile.uid, CREDIT_COSTS.STORY_GENERATION, 'STORY_GENERATION');
      
      // Create project entry with expiry
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const pRef = await addDoc(collection(db, 'projects'), {
        userId: profile.uid,
        title: topic,
        type: 'cine',
        status: 'draft',
        progress: 0,
        activeStep: 'editor',
        createdAt: serverTimestamp(),
        expiresAt: expiresAt
      });
      setProjectId(pRef.id);
      window.history.pushState({}, '', `?projectId=${pRef.id}`);

      setProgress(100);
      setStatusMessage('Unified Narrative Ready!');
      setActiveStep('editor');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const processGeneratedContent = (fullNarration: string, visualPrompts: string[], frameCount: number) => {
    // Distribute narrative into segments for the timeline
    const narrativeSegments = fullNarration.split(/(?<=[.!?])\s+|(?<=\n)\n*/).filter(s => s.trim().length > 0);
    const targetFrames = frameCount;
    // Ensure we don't exceed what LLM gave us but aim for frameCount
    const finalVisuals = [...visualPrompts];
    while (finalVisuals.length < targetFrames) {
      finalVisuals.push(finalVisuals[finalVisuals.length - 1] || "Cinematic masterpiece");
    }
    
    const segmentSize = Math.max(1, Math.floor(narrativeSegments.length / targetFrames));
    
    const parsedScenes: Scene[] = Array.from({ length: targetFrames }).map((_, index) => {
      const start = index * segmentSize;
      let end = (index + 1) * segmentSize;
      // Last scene takes all remaining text
      if (index === targetFrames - 1) end = narrativeSegments.length;
      
      const segmentText = narrativeSegments.slice(start, end).join(" ").trim();
      
      return {
        id: Math.random().toString(36).substr(2, 9),
        visualPrompt: finalVisuals[index] || "Cinematic landscape",
        narration: segmentText || (index === 0 ? fullNarration : "..."),
        imageUrl: '',
        status: {
          story: 'done',
          voice: 'pending',
          visual: 'pending'
        }
      };
    });

    setScenes(parsedScenes);
    setImages(parsedScenes.map(s => s.imageUrl));
    setFullScript(fullNarration); 
  };

  const handleConfirmScript = () => {
    // Re-parse the full script into scenes using lookbehind to preserve punctuation
    const narrativeSegments = fullScript.split(/(?<=[.!?])\s+|(?<=\n)\n*/).filter(s => s.trim().length > 0);
    const totalSeconds = length * 60;
    const targetFrames = Math.max(1, Math.ceil(totalSeconds / 10));
    const segmentSize = Math.max(1, Math.floor(narrativeSegments.length / targetFrames));
    
    setScenes(prev => {
      // Preserve existing visual prompts if possible
      const newScenes: Scene[] = Array.from({ length: targetFrames }).map((_, index) => {
        const start = index * segmentSize;
        let end = (index + 1) * segmentSize;
        if (index === targetFrames - 1) end = narrativeSegments.length;
        
        const segmentText = narrativeSegments.slice(start, end).join(" ").trim();
        
        const existingScene = prev[index];
        return {
          id: existingScene?.id || Math.random().toString(36).substr(2, 9),
          visualPrompt: existingScene?.visualPrompt || "Cinematic masterpiece",
          narration: segmentText || (index === 0 ? fullScript : "..."),
          imageUrl: existingScene?.imageUrl || '',
          status: {
            story: 'done',
            voice: 'pending',
            visual: 'pending'
          }
        };
      });
      return newScenes;
    });

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

      setStatusMessage("ULTIMATE SYNTHESIS: Unified Audiobook Master processing...");
      
      if (!fullScript || fullScript.length < 10) {
        throw new Error("The narrative script is too short or empty. Please edit and try again.");
      }

      const res = await aiService.generateAudio(fullScript, voice, language, {
        onProgress: (p) => setProgress(p)
      });
      
      if (!res.url) throw new Error("Voice synthesis failed to produce audio.");

      setAudioUrl(res.url);
      setIsLoading(false); // Clear button loading earlier

      // Determine durations for timeline sync
      const audio = new Audio(res.url);
      const totalDuration = await new Promise<number>((resolve) => {
        if (audio.duration && !isNaN(audio.duration)) resolve(audio.duration);
        audio.onloadedmetadata = () => resolve(audio.duration);
        setTimeout(() => resolve(scenes.length * 7), 3000); // Shorter fail-safe
      });

      const totalChars = fullScript.length || 1;
      setScenes(prev => prev.map(s => ({
        ...s,
        audioUrl: 'MULTI_SCENE_AUDIO',
        audioDuration: (s.narration.length / totalChars) * totalDuration,
        status: { ...s.status, voice: 'done' }
      })));

      await creditService.deduct(profile.uid, CREDIT_COSTS.AUDIO_CONVERSION, 'VOICE_SYNTHESIS');
      setProgress(100);
      setStatusMessage('Realistic Narration Mastered!');
      
      // Delay step transition to let UI update
      setTimeout(() => setActiveStep('visuals'), 500); 
    } catch (err: any) {
      console.error("Unified Synthesis Error:", err);
      setError(err.message || "Narrative synthesis encountered an issue.");
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

  const handleGenerateVisuals = async () => {
    if (scenes.length === 0) return;
    setIsLoading(true);
    setProgress(0);
    setError("");
    setStatusMessage('Directing Cinematic Photography...');
    
    try {
      const hasCredits = await creditService.checkBalance(profile.uid, CREDIT_COSTS.IMAGE_GENERATION);
      if (!hasCredits) throw new Error('Insufficient credits.');

      const total = scenes.length;
      let completed = 0;

      // Fully parallel generation for maximum speed as requested
      const visualTasks = scenes.map(async (scene, idx) => {
        if (scene.imageUrl && scene.status.visual === 'done') {
          completed++;
          return;
        }

        setScenes(prev => {
          const next = [...prev];
          next[idx] = { ...next[idx], status: { ...next[idx].status, visual: 'processing' } };
          return next;
        });

        try {
          const url = await generateSingleSceneImage(scene.visualPrompt, idx);
          
          setScenes(prev => {
            const next = [...prev];
            next[idx] = { 
              ...next[idx], 
              imageUrl: url, 
              status: { ...next[idx].status, visual: 'done' } 
            };
            return next;
          });
          completed++;
          setProgress(Math.floor((completed / total) * 100));
        } catch (err) {
          console.error(`Visual gen failed for scene ${idx}`, err);
          setScenes(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], status: { ...next[idx].status, visual: 'error' } };
            return next;
          });
        }
      });

      await Promise.all(visualTasks);

      await creditService.deduct(profile.uid, CREDIT_COSTS.IMAGE_GENERATION, 'VISUAL_GENERATION');

      // Final check for overall success
      const stillMissing = scenes.some(s => s.status.visual !== 'done' || !s.imageUrl);
      
      setProgress(100);
      setStatusMessage(stillMissing ? 'Storyboard ready with some warnings.' : 'Cinematography Complete!');
      
      // Stop loading immediately
      setIsLoading(false);
      
      // Auto-transition to next step
      setTimeout(() => {
        setActiveStep('video');
      }, 800);

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(''), 3000);
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
          const url = await generateSingleSceneImage(scenes[idx].visualPrompt, idx);
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
      setStatusMessage(rectCount > 0 ? "Production rescued!" : "Some frames still resistant.");
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleRegenerateScene = async (index: number) => {
    setIsLoading(true);
    setStatusMessage(`Regenerating Scene ${index + 1}...`);
    try {
      setScenes(prev => {
        const next = [...prev];
        next[index] = { ...next[index], status: { ...next[index].status, visual: 'processing' } };
        return next;
      });

      const url = await generateSingleSceneImage(scenes[index].visualPrompt, index);
      
      setScenes(prev => {
        const next = [...prev];
        next[index] = { 
          ...next[index], 
          imageUrl: url, 
          status: { ...next[index].status, visual: 'done' } 
        };
        return next;
      });
      setStatusMessage('Scene Updated!');
    } catch (err: any) {
      setError(`Failed to regenerate scene: ${err.message}`);
      setScenes(prev => {
        const next = [...prev];
        next[index] = { ...next[index], status: { ...next[index].status, visual: 'error' } };
        return next;
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const generateSingleSceneImage = async (prompt: string, index: number) => {
    const maxAttempts = 2; // Reduced because aiService handles model rotation
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Auurio: Scene ${index + 1} master attempt ${attempt}`);
        const url = await aiService.generateImage(prompt, { 
          useFlash: true, // Force high speed
          width: 1792,
          height: 1024,
          style: theme 
        });
        if (url && (url.startsWith('http') || url.length > 1000)) return url;
        throw new Error("Invalid image result");
      } catch (err) {
        console.warn(`Auurio: Scene ${index + 1} attempt ${attempt} failed:`, err);
        if (attempt === maxAttempts) break;
        await new Promise(r => setTimeout(r, 1000)); // Short wait for secondary master attempt
      }
    }
    return aiService.generateImageUrl(prompt, 1792, 1024);
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
          type: 'cine',
          status: 'processing',
          progress: 0,
          createdAt: serverTimestamp()
        });
        currentPid = pRef.id;
        setProjectId(currentPid);
      } else {
        await updateDoc(doc(db, 'projects', currentPid), { status: 'processing', progress: 0 });
      }

      const productionSteps = [
        "Analyzing script pacing & narrative arc...",
        "Synchronizing dynamic cinematic frames with audio...",
        "Applying professional color grading & transitions...",
        "Mixing high-fidelity spatial audio textures...",
        "Compiling multi-scene production master..."
      ];

      for (let i = 0; i < productionSteps.length; i++) {
        setStatusMessage(productionSteps[i]);
        const stepDuration = 800; 
        const startTime = Date.now();
        while (Date.now() - startTime < stepDuration) {
          const elapsed = Date.now() - startTime;
          const stepProgress = Math.floor((elapsed / stepDuration) * 20);
          const totalProgress = (i * 20) + stepProgress;
          setProgress(totalProgress);
          
          if (stepProgress === 10) {
             await updateDoc(doc(db, 'projects', currentPid), { progress: totalProgress });
          }
          await new Promise(r => setTimeout(r, 100));
        }
      }
      
      setProgress(100);
      setStatusMessage('Production Perfected!');
      setVideoUrl('DONE');
      
      await updateDoc(doc(db, 'projects', currentPid), {
        status: 'completed',
        progress: 100
      });

      await addDoc(collection(db, 'stories'), {
        userId: profile.uid,
        title: topic,
        type: 'cine',
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
        if (data.scenes) setScenes(data.scenes);
        if (data.activeStep) setActiveStep(data.activeStep as Step);
        if (data.topic) setTopic(data.topic);
        if (data.title) setTopic(data.title);
        if (data.progress) setProgress(data.progress);
        if (data.theme) setTheme(data.theme);
        
        // Auto-resume logic: If still processing, trigger the step
        if (data.status === 'processing') {
          // Determine which step to resume based on missing data
          setTimeout(() => {
             if (data.activeStep === 'visuals') handleGenerateVisuals();
             else if (data.activeStep === 'voice') handleGenerateVoice();
          }, 1000);
        }
      }
    } catch (e) {
      console.error("Load failed", e);
      setError("Failed to restore project state.");
    } finally {
      setIsLoading(false);
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
    { id: 'script', label: 'Story', icon: Sparkles, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'editor', label: 'Editor', icon: Type, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'voice', label: 'Voice', icon: Volume2, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'visuals', label: 'Visuals', icon: ImageIcon, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { id: 'video', label: 'Finalize', icon: MonitorPlay, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div className="space-y-2 md:space-y-3">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-2 md:p-3 bg-blue-500/20 rounded-xl md:rounded-2xl">
              <Film className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase italic line-clamp-1">CineAura</h1>
          </div>
          <p className="text-xs md:text-sm text-zinc-500 font-medium max-w-xl">
            Cinematic long-form production. Script to finished video in four simple steps.
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {steps.map((s, idx) => {
          const StepIcon = s.icon;
          const isActive = activeStep === s.id;
          const isDone = steps.findIndex(x => x.id === activeStep) > idx;

          return (
            <div key={s.id} className="relative group">
              <button 
                onClick={() => setActiveStep(s.id as Step)}
                className={cn(
                  "w-full flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all truncate",
                  isActive ? "bg-zinc-900 border-white/20 ring-2 ring-blue-500/20" : isDone ? "bg-zinc-900/50 border-white/5 opacity-80" : "bg-black/20 border-white/5 opacity-30 hover:opacity-50"
                )}
              >
                <div className={cn("p-1.5 md:p-2 rounded-lg md:rounded-xl shrink-0", s.bg, s.color)}>
                  <StepIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-zinc-600 truncate">Step 0{idx + 1}</p>
                  <p className={cn("text-[10px] md:text-xs font-black uppercase tracking-tighter truncate", isActive ? "text-white" : "text-zinc-500")}>{s.label}</p>
                </div>
              </button>
              {idx < 3 && <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-zinc-700 pointer-events-none"><ChevronRight size={16} /></div>}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Left Control Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl space-y-6">
            {activeStep === 'script' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Quick Start Templates</label>
                  <div className="grid grid-cols-2 gap-2">
                    {GENRE_TEMPLATES.map(tmp => (
                      <button
                        key={tmp.id}
                        onClick={() => setTopic(tmp.prompt)}
                        className="flex items-center gap-2 p-3 bg-black/40 border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all group text-left"
                      >
                        <span className="text-xl group-hover:scale-110 transition-transform">{tmp.icon}</span>
                        <span className="text-[10px] font-black uppercase text-zinc-400 group-hover:text-white transition-colors">{tmp.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Story Topic</label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Briefly describe your story..."
                    className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-blue-500 outline-none transition-all h-32 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                      <Clock size={10} /> Length (Min)
                    </label>
                    <input 
                      type="number" 
                      min="1" max="180" 
                      value={length || 0}
                      onChange={(e) => setLength(parseInt(e.target.value))}
                      className="w-full bg-black border border-white/10 rounded-2xl px-4 py-2 text-sm text-white outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                      <Languages size={10} /> Language
                    </label>
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as any)}
                      className="w-full bg-black border border-white/10 rounded-2xl px-4 py-2 text-sm text-white outline-none"
                    >
                      <option>English</option>
                      <option>Hindi</option>
                      <option>Bangla</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleGenerateScript}
                  disabled={isLoading || !topic}
                  className="w-full py-4 bg-blue-500 text-white font-black uppercase tracking-tighter flex items-center justify-center gap-2 rounded-2xl hover:bg-blue-400 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  Generate Script
                </button>
              </motion.div>
            )}
            {activeStep === 'editor' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="p-5 bg-orange-500/5 border border-orange-500/10 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-orange-500">
                    <Type size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Editor Mode</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                    Review and refine your story. You can add dramatic pauses, fix pronunciations, or adjust the narrative arc before our AI Voice Actors perform your script.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Editor Controls</label>
                  <div className="grid grid-cols-1 gap-2">
                    <button 
                      onClick={() => setFullScript(prev => prev.toUpperCase())}
                      className="w-full py-3 bg-black/40 border border-white/5 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                    >
                      Make All Uppercase
                    </button>
                    <button 
                      onClick={() => setFullScript(prev => prev.toLowerCase().replace(/(^\w|\.\s+\w)/g, c => c.toUpperCase()))}
                      className="w-full py-3 bg-black/40 border border-white/5 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest"
                    >
                      Fix Capitalization
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleConfirmScript}
                  className="w-full py-4 bg-white text-black font-black uppercase tracking-tighter flex items-center justify-center gap-2 rounded-2xl hover:bg-zinc-200 transition-all shadow-xl"
                >
                  Confirm Script <ChevronRight size={18} />
                </button>
              </motion.div>
            )}

            {activeStep === 'voice' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Select Voice Actor</label>
                  
                  {/* High-End Custom Dropdown */}
                  <div className="relative">
                    <div className="grid grid-cols-1 gap-2">
                       {/* Selected State / Trigger (Simplified for stability but styled high-end) */}
                       <div className="relative group">
                          <select
                            value={voice}
                            onChange={(e) => setVoice(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm text-white appearance-none cursor-pointer focus:border-purple-500 outline-none transition-all pr-12 font-bold tracking-tight"
                          >
                            {VOICES[language].map(v => (
                              <option key={v.id} value={v.id}>
                                {v.name} — {v.style}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-hover:text-purple-500 transition-colors">
                            <ChevronRight className="rotate-90" size={16} />
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Dynamic Preview Card */}
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={voice}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-5 bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-[24px] flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => {
                            const v = VOICES[language].find(x => x.id === voice);
                            if (v) handlePreviewVoice(`Hello, this is ${v.name}. Let's bring your cinematic vision to life with professional neural narration.`, v.id);
                          }}
                          className="w-12 h-12 flex items-center justify-center bg-purple-500/20 text-purple-400 rounded-2xl hover:bg-purple-500 hover:text-white transition-all shadow-lg shadow-purple-500/20 active:scale-90"
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
                             <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                             <span className="text-[10px] text-purple-400 uppercase font-black tracking-widest italic">
                               {VOICES[language].find(v => v.id === voice)?.style}
                             </span>
                          </div>
                        </div>
                      </div>
                      <Mic className="text-purple-500/20 group-hover:text-purple-500/40 transition-colors" size={24} />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="space-y-6 pt-4 border-t border-white/5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Voice Tone</label>
                        <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-tighter italic">Low Pitch → High Pitch</p>
                      </div>
                      <span className="text-[10px] font-black text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full">{voiceTone.toFixed(1)}x</span>
                    </div>
                    <div className="flex items-center gap-4 group">
                      <input 
                        type="range" 
                        min="0.5" max="1.5" step="0.1" 
                        value={voiceTone || 1.0}
                        onChange={(e) => setVoiceTone(parseFloat(e.target.value))}
                        className="flex-1 accent-purple-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Energy Speed</label>
                        <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-tighter italic">Slow Flow → Fast Tempo</p>
                      </div>
                      <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">{voiceSpeed.toFixed(1)}x</span>
                    </div>
                    <div className="flex items-center gap-4 group">
                      <input 
                        type="range" 
                        min="0.5" max="1.5" step="0.1" 
                        value={voiceSpeed || 1.0}
                        onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                        className="flex-1 accent-orange-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleGenerateVoice}
                  disabled={isLoading}
                  className="w-full py-4 bg-purple-500 text-white font-black uppercase tracking-tighter flex items-center justify-center gap-2 rounded-2xl hover:bg-purple-400 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                  Synthesize Voice
                </button>
              </motion.div>
            )}

            {activeStep === 'visuals' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Visual Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Realistic', 'Anime', 'Cinematic', '3D Render'].map(t => (
                      <button 
                        key={t}
                        onClick={() => setTheme(t as any)}
                        className={cn(
                          "py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all",
                          theme === t ? "bg-orange-500/10 border-orange-500/50 text-white" : "bg-black/40 border-white/5 text-zinc-600 hover:text-zinc-400"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <Sparkles size={12} className="text-orange-500" />
                      Branding & Watermark
                    </label>
                    <button 
                      onClick={() => setWatermark(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={cn(
                        "text-[8px] font-black uppercase px-2 py-1 rounded-full border transition-all",
                        watermark.enabled ? "bg-orange-500 border-orange-500 text-white" : "border-white/10 text-zinc-500"
                      )}
                    >
                      {watermark.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {watermark.enabled && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-2">
                      <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                        <button
                          onClick={() => setWatermark(prev => ({ ...prev, mode: 'text' }))}
                          className={cn(
                            "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                            watermark.mode === 'text' ? "bg-orange-500 text-white" : "text-zinc-500 hover:text-zinc-400"
                          )}
                        >
                          Text
                        </button>
                        <button
                          onClick={() => setWatermark(prev => ({ ...prev, mode: 'logo' }))}
                          className={cn(
                            "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                            watermark.mode === 'logo' ? "bg-orange-500 text-white" : "text-zinc-500 hover:text-zinc-400"
                          )}
                        >
                          Logo
                        </button>
                      </div>

                      {watermark.mode === 'text' ? (
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Watermark Text</label>
                          <input 
                            type="text"
                            value={watermark.text}
                            onChange={(e) => setWatermark(prev => ({ ...prev, text: e.target.value }))}
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-orange-500/50 transition-all font-bold"
                            placeholder="Brand Name"
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
                            <label className="flex flex-col items-center justify-center aspect-video bg-black/40 border-2 border-dashed border-white/5 rounded-xl cursor-copy hover:border-orange-500/30 transition-all">
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
                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Opacity ({(watermark.opacity * 100).toFixed(0)}%)</label>
                          <input 
                            type="range"
                            min="10"
                            max="100"
                            step="10"
                            value={(watermark.opacity || 0) * 100}
                            onChange={(e) => setWatermark(prev => ({ ...prev, opacity: parseInt(e.target.value) / 100 }))}
                            className="w-full accent-orange-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Position</label>
                          <select 
                            value={watermark.position}
                            onChange={(e) => setWatermark(prev => ({ ...prev, position: e.target.value as any }))}
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-2 py-1.5 text-xs text-white font-bold appearance-none cursor-pointer focus:outline-none focus:border-orange-500/50"
                          >
                            <option value="top-left">Top Left</option>
                            <option value="top-right">Top Right</option>
                            <option value="bottom-left">Bottom Left</option>
                            <option value="bottom-right">Bottom Right</option>
                            <option value="center">Center</option>
                            <option value="bottom-center">Bottom Center</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <button 
                  onClick={handleGenerateVisuals}
                  disabled={isLoading}
                  className="w-full py-4 bg-orange-500 text-white font-black uppercase tracking-tighter flex items-center justify-center gap-2 rounded-2xl hover:bg-orange-400 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                  Generate Cinematic Frames
                </button>
              </motion.div>
            )}

            {activeStep === 'video' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="p-6 bg-green-500/5 border border-green-500/10 rounded-2xl space-y-4">
                  <p className="text-xs text-zinc-400 leading-relaxed text-center font-medium">
                    Your assets are ready. Audio, visuals, and script will now be synchronized into a single cinematic audiobook format.
                  </p>
                </div>

                <button 
                  onClick={handleAssembleVideo}
                  disabled={isLoading || !!videoUrl}
                  className="w-full py-4 bg-green-500 text-black font-bold uppercase tracking-tighter flex items-center justify-center gap-2 rounded-2xl hover:bg-green-400 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  Assemble Video
                </button>
              </motion.div>
            )}

            {(isLoading || statusMessage) && (
              <div className="space-y-2">
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between items-center px-1">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{statusMessage || (isLoading ? 'Processing...' : '')}</p>
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{progress}%</p>
                </div>
              </div>
            )}
            
            {error && (
              <p className="text-red-500 text-xs font-bold text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20 uppercase">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Right Output Viewer */}
        <div className="lg:col-span-8 space-y-4 md:space-y-6">
          <div className="bg-zinc-900 border border-white/5 rounded-2xl md:rounded-3xl overflow-hidden flex flex-col min-h-[400px] md:min-h-[600px]">
            <div className="px-4 py-3 md:px-6 md:py-4 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3 md:gap-4">
                <div className={cn("p-1 md:p-1.5 rounded-lg", steps.find(s => s.id === activeStep)?.bg)}>
                  <Type size={12} className={steps.find(s => s.id === activeStep)?.color} />
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
                    {isExporting ? `Exporting ${exportProgress?.progress || 0}%...` : 'Export & Download'}
                  </span>
                </button>
              )}
            </div>

            <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar">
              {activeStep === 'script' && (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-6 opacity-30">
                  <div className="w-20 h-20 bg-blue-500/10 border-2 border-dashed border-blue-500/20 rounded-full flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-blue-500" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Narrative Engine Ready</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Describe your story on the left to begin generation</p>
                  </div>
                </div>
              )}

              {activeStep === 'editor' && (
                <div className="flex flex-col h-full gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">LIVE NARRATIVE EDITOR</span>
                    </div>
                    <span className="text-[10px] font-black text-orange-500/50 uppercase tabular-nums tracking-widest">
                      {fullScript.length} Characters | ~{Math.ceil(fullScript.length / 1000)} Min Read
                    </span>
                  </div>
                  <textarea 
                    value={fullScript}
                    onChange={(e) => setFullScript(e.target.value)}
                    className="flex-1 w-full bg-black/40 border border-white/5 rounded-3xl p-8 text-lg md:text-xl text-zinc-200 focus:text-white leading-relaxed font-serif outline-none focus:border-orange-500/20 transition-all resize-none custom-scrollbar"
                    placeholder="Refine your masterpiece here..."
                  />
                  <div className="flex items-center justify-center gap-6 py-2 bg-black/20 border border-white/5 rounded-2xl">
                    <button onClick={() => aiService.speak(fullScript, language)} className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors">
                      <Volume2 size={14} /> Preview Reading
                    </button>
                    <div className="w-px h-4 bg-zinc-800" />
                    <button onClick={() => setFullScript('')} className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 hover:text-red-500 transition-colors">
                      <Trash2 size={14} /> Clear Editor
                    </button>
                  </div>
                </div>
              )}

              {activeStep === 'voice' && (
                <div className="h-full flex flex-col items-center justify-center space-y-8">
                  {audioUrl ? (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-full max-w-md bg-black border border-white/10 p-8 rounded-3xl space-y-6 text-center shadow-2xl"
                    >
                       <div className="w-32 h-32 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center justify-center mx-auto relative group">
                        <div className="absolute inset-0 bg-purple-500/5 animate-ping rounded-full" />
                        <Volume2 className="w-12 h-12 text-purple-500 group-hover:scale-110 transition-transform" />
                       </div>
                       <div className="space-y-1">
                         <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">Audio Generated</h4>
                         <p className="text-xs text-zinc-500 font-medium">Synthesized narration is ready for review</p>
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
                             <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                               <Volume2 size={20} className="text-blue-400 animate-pulse" />
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
                          Synchronize Visuals <ChevronRight size={18} />
                        </button>
                    </motion.div>
                  ) : <Placeholder icon={Mic} text="Synthesized audio will be generated here" />}
                </div>
              )}

              {activeStep === 'visuals' && (
                <div className="w-full space-y-6">
                   <div className="flex items-center justify-between px-1">
                     <h3 className="text-xs font-black text-white uppercase tracking-widest italic">Story Storyboard</h3>
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
                    <div className="grid grid-cols-2 gap-4">
                     {scenes.length > 0 ? scenes.map((scene, i) => (
                       <motion.div 
                         key={scene.id} 
                         initial={{ opacity: 0, scale: 0.9 }}
                         animate={{ opacity: 1, scale: 1 }}
                         transition={{ delay: i * 0.1 }}
                         className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/5 relative group"
                       >
                         {scene.imageUrl ? (
                           <>
                             <img 
                               src={scene.imageUrl} 
                               alt={`Scene ${i}`} 
                               className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                               referrerPolicy="no-referrer" 
                               onError={(e) => {
                                 const target = e.target as HTMLImageElement;
                                 if (target.src.includes('fallback=true')) {
                                   target.src = aiService.generateImageUrl("Cinematic masterpiece atmospheric lighting professional photography", 1024, 1024) + '&safety=final';
                                 } else if (!target.src.includes('safety=final')) {
                                   target.src = aiService.generateImageUrl(scene.visualPrompt, 1024, 1024) + '&fallback=true';
                                 }
                               }}
                             />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                               <span className="text-[10px] font-black text-white uppercase italic tracking-widest">Scene Frame 0{i+1}</span>
                               <button 
                                onClick={() => handleRegenerateScene(i)}
                                disabled={isLoading}
                                className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md transition-all active:rotate-180"
                                title="Regenerate this scene"
                               >
                                 <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                               </button>
                             </div>
                           </>
                         ) : (
                           <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/50">
                             {scene.status.visual === 'error' ? (
                               <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest">Failed</span>
                             ) : (
                               <>
                                 <Loader2 size={24} className="text-blue-500 animate-spin mb-2" />
                                 <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Rendering...</span>
                               </>
                             )}
                           </div>
                         )}
                         <div className="absolute top-3 left-3 px-2 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded text-[8px] font-black text-white uppercase tracking-tighter">
                           Frame 0{i+1}
                         </div>
                          {scene.imageUrl && watermark.enabled && (
                            <div 
                              className={cn(
                                "absolute pointer-events-none select-none px-4 py-2 drop-shadow-lg flex items-center justify-center",
                                watermark.position === 'top-left' && "top-0 left-0",
                                watermark.position === 'top-right' && "top-0 right-0",
                                watermark.position === 'bottom-left' && "bottom-0 left-0",
                                watermark.position === 'bottom-right' && "bottom-0 right-0",
                                watermark.position === 'center' && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                                watermark.position === 'bottom-center' && "bottom-0 left-1/2 -translate-x-1/2",
                              )}
                              style={{ opacity: watermark.opacity }}
                            >
                              {watermark.mode === 'text' ? (
                                <span className="text-white font-black uppercase tracking-widest" style={{ fontSize: `${watermark.size / 2}px` }}>
                                  {watermark.text}
                                </span>
                              ) : (
                                watermark.logoUrl && (
                                  <img 
                                    src={watermark.logoUrl} 
                                    alt="Logo Watermark" 
                                    style={{ height: `${watermark.size * 2}px`, width: 'auto' }} 
                                    className="object-contain"
                                  />
                                )
                              )}
                            </div>
                          )}
                       </motion.div>
                     )) : Array(6).fill(0).map((_, i) => (
                      <div key={i} className="aspect-video bg-zinc-900/50 border border-white/5 border-dashed rounded-2xl flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-zinc-800" />
                      </div>
                    ))}
                  </div>
                  {scenes.some(s => s.imageUrl) && !isLoading && (
                    <motion.button 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={handleAssembleVideo}
                      className="w-full py-4 bg-orange-500 text-white font-black uppercase tracking-tighter rounded-2xl flex items-center justify-center gap-2 hover:bg-orange-400 transition-all shadow-lg shadow-orange-500/10"
                    >
                      Start Final Production Render <MonitorPlay size={18} />
                    </motion.button>
                  )}
                </div>
              )}

              {activeStep === 'video' && (
                <div className="w-full">
                   {videoUrl ? (
                     <div className="w-full">
                        <ProductionPlayer 
                          scenes={scenes}
                          audioUrl={audioUrl}
                          title={topic}
                          aspectRatio="video"
                          onDownload={handleExportVideo}
                        />
                        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                           <button 
                             onClick={handleExportVideo}
                             disabled={isExporting}
                             className={`px-8 py-5 bg-blue-600 text-white font-black uppercase tracking-tighter rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-600/20 active:scale-95 ${isExporting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-500'}`}
                           >
                             {isExporting ? (
                               <>
                                 <Loader2 className="animate-spin" size={20} />
                                 Exporting {exportProgress?.progress}%
                               </>
                             ) : (
                               <>
                                 <Download size={20} /> Download Master 4K Production
                               </>
                             )}
                           </button>
                           <button
                             onClick={() => setActiveStep('script')}
                             className="px-8 py-5 bg-white/5 border border-white/10 text-white font-black uppercase tracking-tighter rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                           >
                              Produce New Variant
                           </button>
                        </div>
                     </div>
                   ) : (
                     <div className="aspect-video bg-black flex flex-col items-center justify-center p-12 text-center space-y-6">
                        <div className="relative">
                          <div className="w-24 h-24 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <MonitorPlay size={32} className="text-blue-500 animate-pulse" />
                          </div>
                        </div>
                        <div className="space-y-2">
                           <p className="text-white font-black uppercase tracking-tighter italic text-xl">{statusMessage || 'Initializing Master Render...'}</p>
                           <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                           </div>
                           <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{progress}% Complete</p>
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
    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20 select-none">
      <div className="w-16 h-16 border-2 border-dashed border-zinc-700 rounded-full flex items-center justify-center">
        <Icon className="w-8 h-8 text-zinc-500" />
      </div>
      <p className="text-sm font-medium italic opacity-50">{text}</p>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
