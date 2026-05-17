import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Loader2, 
  Mic, 
  Type,
  Languages,
  Clock,
  Volume2,
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

type Step = 'script' | 'editor' | 'voice' | 'output';

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
    { id: 'puck', name: 'Puck (উर्जस्ववी)', country: 'India', style: 'রিলে হাই এনার্জি' }
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

export default function CineVoice({ profile }: { profile: any }) {
  const [activeStep, setActiveStep] = useState<Step>('script');
  const [topic, setTopic] = useState('');
  const [length, setLength] = useState(5); // Minutes
  const [language, setLanguage] = useState<'English' | 'Hindi' | 'Bangla'>('English');
  const [voice, setVoice] = useState(VOICES.English[0].id);
  const [voiceTone, setVoiceTone] = useState(1.0);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  
  const [fullScript, setFullScript] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
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
        audioUrl,
        fullScript,
        activeStep,
        progress,
        topic,
        language,
        voice,
        length,
        updatedAt: serverTimestamp(),
        ...updates
      });
    } catch (e) {
      console.error("Auto-save failed", e);
    }
  };

  useEffect(() => {
    if (!isProjectLoading.current && projectId && (fullScript || activeStep !== 'script')) {
      saveProjectState();
    }
  }, [activeStep, fullScript, topic, voice, audioUrl]);

  useEffect(() => {
    return () => aiService.stopSpeaking();
  }, []);

  const handleGenerateScript = async () => {
    if (!topic || topic.length < 5) return;
    setError('');
    setIsLoading(true);
    setProgress(10);
    setStatusMessage('Crafting Cohesive Narrative...');

    try {
      const hasCredits = await creditService.checkBalance(profile.uid, CREDIT_COSTS.STORY_GENERATION);
      if (!hasCredits) throw new Error('Insufficient credits.');

      const prompt = `ACT AS A MASTER CINEMATIC STORYTELLER.
      Write an expressive narrative story script for ${length} minutes in ${language} about: ${topic}. 
      
      STORY REQUIREMENTS:
      1. COHESIVE: One single, continuous, and expressive narrative script. 
      2. FLOW: It must flow naturally like an audiobook chapter.
      3. VOICE: Design the tone for a realistic, expressive storyteller's voice.
      
      Output ONLY the full story narrative.`;

      const generatedContent = await aiService.generateText(prompt, undefined, (status) => setStatusMessage(status));
      setFullScript(generatedContent);
      
      await creditService.deduct(profile.uid, CREDIT_COSTS.STORY_GENERATION, 'STORY_GENERATION');
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const pRef = await addDoc(collection(db, 'projects'), {
        userId: profile.uid,
        title: topic,
        topic,
        type: 'cinevoice',
        status: 'draft',
        progress: 0,
        activeStep: 'editor',
        fullScript: generatedContent,
        language,
        length,
        voice,
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

  const handleGenerateVoice = async () => {
    if (!fullScript) return;
    setIsLoading(true);
    setProgress(0);
    setError('');
    setAudioUrl("");
    setActiveStep('voice');

    try {
      const hasCredits = await creditService.checkBalance(profile.uid, CREDIT_COSTS.AUDIO_CONVERSION);
      if (!hasCredits) throw new Error('Insufficient credits.');

      setStatusMessage("ULTIMATE SYNTHESIS: Unified Audiobook Master processing...");
      
      const res = await aiService.generateAudio(fullScript, voice, language, {
        pitch: voiceTone,
        speed: voiceSpeed,
        onProgress: (p) => setProgress(p)
      });
      
      if (!res.url) throw new Error("Voice synthesis failed.");

      setAudioUrl(res.url);
      await saveProjectState({ audioUrl: res.url });
      
      await creditService.deduct(profile.uid, CREDIT_COSTS.AUDIO_CONVERSION, 'VOICE_SYNTHESIS');
      setProgress(100);
      setStatusMessage('Realistic Narration Mastered!');
      setActiveStep('output');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `Auurio_Voice_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  return (
    <div className="flex-1 bg-[#050505] p-2 md:p-6 overflow-hidden">
      <div className="max-w-7xl mx-auto h-full flex flex-col gap-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
              <Mic className="text-purple-500" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">CineVoice</h1>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">AI Storyteller & Voice Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
            {(['script', 'editor', 'voice', 'output'] as Step[]).map((step, idx) => (
              <div key={step} className="flex items-center gap-2 px-1">
                <button 
                  disabled={isLoading}
                  onClick={() => {
                    if (step === 'script' || (fullScript && step === 'editor') || (audioUrl && step === 'output')) {
                      setActiveStep(step as any);
                    }
                  }}
                  className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${activeStep === step ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-zinc-500 hover:text-white disabled:opacity-30'}`}
                >
                  Step 0{idx + 1}
                </button>
                {idx < 3 && <ChevronRight size={10} className="text-zinc-800" />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-zinc-900/40 border border-white/5 rounded-[40px] overflow-hidden flex flex-col md:flex-row shadow-2xl backdrop-blur-xl relative">
          
          <div className="w-full md:w-[380px] border-b md:border-b-0 md:border-r border-white/5 flex flex-col bg-black/20">
            <div className="p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-500" />
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Generation Mode</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {GENRE_TEMPLATES.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => setTopic(t.prompt)}
                      className="p-3 bg-black/40 border border-white/5 rounded-2xl flex flex-col items-center gap-2 hover:border-purple-500/30 transition-all group"
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform">{t.icon}</span>
                      <span className="text-[9px] font-black text-zinc-500 group-hover:text-white uppercase tracking-tighter">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Describe Your Story</label>
                  <div className="flex items-center gap-2 text-[10px] font-black text-purple-500 uppercase">
                    <Clock size={12} />
                    <span>{length} Min</span>
                  </div>
                </div>
                <textarea 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full h-32 bg-black border border-white/5 rounded-2xl p-4 text-xs text-white placeholder-zinc-700 outline-none focus:border-purple-500/30 transition-all resize-none shadow-inner"
                  placeholder="Tell me about..."
                />
                <input 
                  type="range" min="1" max="10" step="1" 
                  value={length} onChange={(e) => setLength(parseInt(e.target.value))}
                  className="w-full accent-purple-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic size={14} className="text-purple-500" />
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Narrative Style</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {Object.keys(VOICES).map(lang => (
                      <button 
                        key={lang}
                        onClick={() => setLanguage(lang as any)}
                        className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${language === lang ? 'bg-white text-black' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {VOICES[language].map(v => (
                      <button 
                        key={v.id}
                        onClick={() => setVoice(v.id)}
                        className={`p-3 rounded-2xl flex items-center justify-between border transition-all ${voice === v.id ? 'bg-purple-600/10 border-purple-500/50 text-white' : 'bg-black/40 border-white/5 text-zinc-500 hover:text-white'}`}
                      >
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase tracking-tighter">{v.name}</p>
                          <p className="text-[8px] font-bold text-zinc-500 uppercase">{v.style}</p>
                        </div>
                        <Volume2 size={12} className={voice === v.id ? 'text-purple-500' : 'text-zinc-800'} />
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                        <span>Pitch Control</span>
                        <span className="text-purple-500">{voiceTone}x</span>
                      </div>
                      <input 
                        type="range" min="0.5" max="1.5" step="0.1" 
                        value={voiceTone} onChange={(e) => setVoiceTone(parseFloat(e.target.value))}
                        className="w-full accent-purple-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                        <span>Narration Speed</span>
                        <span className="text-purple-500">{voiceSpeed}x</span>
                      </div>
                      <input 
                        type="range" min="0.5" max="1.5" step="0.1" 
                        value={voiceSpeed} onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                        className="w-full accent-purple-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 border-t border-white/5">
              <button 
                onClick={activeStep === 'script' ? handleGenerateScript : handleGenerateVoice}
                disabled={isLoading || (activeStep === 'script' && !topic)}
                className="w-full py-5 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-black uppercase tracking-tighter flex items-center justify-center gap-3 rounded-[32px] hover:scale-105 transition-all active:scale-95 disabled:opacity-50 shadow-2xl shadow-purple-600/20"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : (activeStep === 'script' ? 'Generate Story Master' : 'Synthesize Voice Master')}
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="h-16 md:h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/10">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-purple-500 animate-pulse' : (error ? 'bg-red-500' : 'bg-green-500')}`} />
                <span className={`text-[10px] font-black uppercase tracking-widest italic ${error ? 'text-red-500' : 'text-white'}`}>
                  {error ? `ERROR: ${error}` : (statusMessage || 'Auurio Voice Engine Active')}
                </span>
              </div>
              
              {activeStep === 'output' && audioUrl && (
                <button 
                  onClick={handleDownload}
                  className="px-6 py-3 bg-white text-black font-black uppercase tracking-tighter rounded-xl hover:scale-105 transition-all active:scale-95 flex items-center gap-2 shadow-xl"
                >
                  <Download size={16} /> Download Audio
                </button>
              )}
            </div>

            <div className="flex-1 p-6 md:p-12 overflow-y-auto custom-scrollbar">
              <AnimatePresence mode="wait">
                {activeStep === 'script' && (
                  <motion.div 
                    key="script"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="h-full flex flex-col items-center justify-center space-y-6 opacity-30 select-none"
                  >
                    <div className="w-24 h-24 bg-purple-500/10 border-2 border-dashed border-purple-500/20 rounded-full flex items-center justify-center">
                      <Mic className="w-12 h-12 text-purple-500" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Ready for Narration</h3>
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Describe your story to begin</p>
                    </div>
                  </motion.div>
                )}

                {activeStep === 'editor' && (
                  <motion.div 
                    key="editor"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col h-full gap-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Type size={14} className="text-purple-500" />
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">STORY NARRATIVE EDITOR</span>
                      </div>
                      <span className="text-[10px] font-black text-purple-500/50 uppercase tabular-nums tracking-widest">
                        {fullScript.length} Characters
                      </span>
                    </div>
                    <textarea 
                      value={fullScript}
                      onChange={(e) => setFullScript(e.target.value)}
                      className="flex-1 w-full bg-black/40 border border-white/5 rounded-[40px] p-8 md:p-12 text-xl md:text-3xl text-zinc-200 focus:text-white leading-relaxed font-serif outline-none focus:border-purple-500/20 transition-all resize-none custom-scrollbar"
                      placeholder="Refine your narrative here..."
                    />
                    <div className="flex items-center justify-center gap-8 py-4 bg-black/20 border border-white/5 rounded-3xl">
                      <button onClick={() => handlePreviewVoice("This is a quick preview of my expressive cinematic voice.", voice)} className="flex items-center gap-2 text-xs font-black uppercase text-zinc-500 hover:text-white transition-colors">
                        <Volume2 size={16} /> Preview Voice
                      </button>
                      <div className="w-px h-6 bg-zinc-800" />
                      <button onClick={() => setFullScript('')} className="flex items-center gap-2 text-xs font-black uppercase text-zinc-500 hover:text-red-500 transition-colors">
                        <Trash2 size={16} /> Reset Script
                      </button>
                    </div>
                  </motion.div>
                )}

                {(activeStep as any) === 'voice' && (
                  <motion.div 
                    key="voice"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center"
                  >
                    <div className="relative text-center space-y-8">
                       <div className="w-48 h-48 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto flex items-center justify-center p-8">
                          <div className="w-full h-full bg-purple-500/10 rounded-full flex items-center justify-center animate-pulse">
                            <Volume2 className="text-purple-500" size={48} />
                          </div>
                       </div>
                       <div className="space-y-4">
                          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter italic leading-none">{statusMessage || 'Synthesizing Audio...'}</h2>
                          <div className="w-64 h-2 bg-white/5 rounded-full overflow-hidden mx-auto">
                             <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                          </div>
                          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{progress}% Complete</p>
                       </div>
                    </div>
                  </motion.div>
                )}

                {activeStep === 'output' && (
                  <motion.div 
                    key="output"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="h-full flex flex-col items-center justify-center p-8 text-center space-y-8"
                  >
                    <div className="w-64 h-64 bg-gradient-to-br from-purple-600/20 to-purple-900/10 rounded-[64px] border border-purple-500/30 flex items-center justify-center shadow-2xl relative group">
                       <div className="absolute inset-0 bg-purple-500/10 animate-pulse rounded-[64px]" />
                       <div className="relative transform group-hover:scale-110 transition-transform duration-500">
                         <Volume2 className="text-purple-500" size={80} />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Voice Master Ready</h2>
                       <p className="text-sm text-zinc-500 font-medium max-w-md mx-auto">Your story was successfully narrated and synthesized into a high-fidelity audio master.</p>
                    </div>

                    <div className="w-full max-w-md">
                       <audio src={audioUrl} controls className="w-full custom-audio brightness-110" />
                    </div>

                    <div className="flex gap-4">
                       <button onClick={handleDownload} className="px-12 py-5 bg-purple-600 text-white font-black uppercase tracking-tighter rounded-full hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-purple-600/20 flex items-center gap-3">
                         <Download size={20} /> Download Master
                       </button>
                       <button onClick={() => setActiveStep('editor')} className="px-12 py-5 bg-white/5 border border-white/10 text-white font-black uppercase tracking-tighter rounded-full hover:bg-white/10 transition-all active:scale-95">
                         Edit Narrative
                       </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
