import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Scene {
  id: string;
  visualPrompt: string;
  narration: string;
  imageUrl: string;
  audioUrl?: string;
  audioDuration?: number;
}

interface ProductionPlayerProps {
  scenes: Scene[];
  audioUrl: string;
  title?: string;
  onDownload?: () => void;
  aspectRatio?: 'video' | 'reel';
  onComplete?: () => void;
}

export default function ProductionPlayer({ 
  scenes, 
  audioUrl, 
  title, 
  onDownload, 
  aspectRatio = 'video',
  onComplete 
}: ProductionPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [audioBuffers, setAudioBuffers] = useState<(AudioBuffer | null)[]>([]);
  
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const controlsTimeout = useRef<any>();

  // Init Audio & Preload
  useEffect(() => {
    const loadAudio = async () => {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      const buffers: (AudioBuffer | null)[] = [];
      let total = 0;

      // Check if we have a valid master audio URL and if scenes are unlinked
      const isUnifiedMode = audioUrl && audioUrl.startsWith('data:audio') || audioUrl.startsWith('blob:') || audioUrl.startsWith('/');
      const anySceneHasAudio = scenes.some(s => s.audioUrl && s.audioUrl !== 'MULTI_SCENE_AUDIO');

      if (isUnifiedMode && !anySceneHasAudio) {
        try {
          const res = await fetch(audioUrl);
          const arrayBuffer = await res.arrayBuffer();
          const masterBuffer = await ctx.decodeAudioData(arrayBuffer);
          
          // In unified mode, the first buffer is the master. Others are spacers.
          buffers.push(masterBuffer);
          total = masterBuffer.duration;
          
          // Fill rest with null but keep total duration correct for scenes
          for (let i = 1; i < scenes.length; i++) {
            buffers.push(null);
          }
        } catch (e) {
          console.error("Failed to load master audio:", e);
        }
      } else {
        for (const scene of scenes) {
          if (scene.audioUrl && scene.audioUrl !== 'MULTI_SCENE_AUDIO') {
            try {
              const res = await fetch(scene.audioUrl);
              const arrayBuffer = await res.arrayBuffer();
              const buffer = await ctx.decodeAudioData(arrayBuffer);
              buffers.push(buffer);
              total += buffer.duration;
            } catch (e) {
              console.error("Failed to load scene audio:", e);
              buffers.push(null);
              total += scene.audioDuration || 5;
            }
          } else {
            buffers.push(null);
            total += scene.audioDuration || 5;
          }
        }
      }

      setAudioBuffers(buffers);
      setTotalDuration(total);
      setIsReady(true);
    };

    if (scenes.length > 0) loadAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [scenes, audioUrl]);

  const sceneStartTimes = useMemo(() => {
    const times: number[] = [];
    let current = 0;
    
    // Check if we are in unified mode (first buffer is the master)
    const isUnifiedMode = audioBuffers.length > 0 && audioBuffers[0] !== null && audioBuffers.slice(1).every(b => b === null);

    if (isUnifiedMode && audioBuffers[0]) {
      const totalAudioDur = audioBuffers[0].duration;
      const totalChars = scenes.reduce((sum, s) => sum + s.narration.length, 0) || 1;
      
      for (const scene of scenes) {
        times.push(current);
        // Use provided audioDuration or estimate from text length relative to master buffer
        const dur = scene.audioDuration || (scene.narration.length / totalChars) * totalAudioDur;
        current += dur;
      }
    } else {
      for (let i = 0; i < audioBuffers.length; i++) {
        times.push(current);
        const buffer = audioBuffers[i];
        const scene = scenes[i];
        current += buffer?.duration || scene?.audioDuration || 5;
      }
    }
    return times;
  }, [audioBuffers, scenes]);

  const togglePlay = async () => {
    if (!isReady || !audioContextRef.current) return;

    if (isPlaying) {
      // Pause
      pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      sourcesRef.current.forEach(s => {
        try { 
          s.stop(); 
        } catch (e) {
          // Ignore if already stopped
        }
      });
      sourcesRef.current = [];
      setIsPlaying(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    } else {
      // Resume/Start
      await audioContextRef.current.resume();
      const now = audioContextRef.current.currentTime;
      startTimeRef.current = now - pauseTimeRef.current;
      
      // Schedule all remaining buffers
      audioBuffers.forEach((buffer, i) => {
        const startOffset = sceneStartTimes[i];
        const relativeStart = startOffset - pauseTimeRef.current;

        if (buffer && startOffset + buffer.duration > pauseTimeRef.current) {
          const source = audioContextRef.current!.createBufferSource();
          source.buffer = buffer;
          const gainNode = audioContextRef.current!.createGain();
          gainNode.gain.value = isMuted ? 0 : volume;
          source.connect(gainNode);
          gainNode.connect(audioContextRef.current!.destination);
          
          const offsetInCurrentBuffer = Math.max(0, pauseTimeRef.current - startOffset);
          const whenToStart = Math.max(0, relativeStart);
          
          source.start(now + whenToStart, offsetInCurrentBuffer);
          sourcesRef.current.push(source);
        }
      });

      setIsPlaying(true);
      updateProgress();
    }
  };

  const updateProgress = () => {
    if (!audioContextRef.current) return;
    const now = audioContextRef.current.currentTime;
    const elapsed = now - startTimeRef.current;
    
    if (elapsed >= totalDuration) {
      setIsPlaying(false);
      setProgress(100);
      setCurrentTime(totalDuration);
      onComplete?.();
      return;
    }

    setCurrentTime(elapsed);
    setProgress((elapsed / totalDuration) * 100);

    const activeIdx = sceneStartTimes.findLastIndex(start => elapsed >= start);
    if (activeIdx !== -1 && activeIdx !== currentSceneIndex) {
      setCurrentSceneIndex(activeIdx);
    }

    animationFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const newTime = (val / 100) * totalDuration;
    
    // Stop current
    sourcesRef.current.forEach(s => {
      try { 
        s.stop(); 
      } catch (err) {
        // Already stopped
      }
    });
    sourcesRef.current = [];
    
    pauseTimeRef.current = newTime;
    setCurrentTime(newTime);
    setProgress(val);
    
    if (isPlaying) {
      setIsPlaying(false);
      togglePlay(); // Restart from new time
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    if (isPlaying) {
      controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative group bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 border border-white/5 ${
        aspectRatio === 'reel' ? 'aspect-[9/16] max-w-[360px] mx-auto' : 'aspect-video w-full'
      }`}
    >
      {/* Dynamic Screen */}
      <div className="absolute inset-0 bg-black overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentSceneIndex}
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ 
              opacity: 1,
              scale: currentSceneIndex % 3 === 0 ? [1.1, 1.25] : [1.25, 1.1],
              x: currentSceneIndex % 4 === 0 ? [-30, 30] : currentSceneIndex % 4 === 1 ? [30, -30] : [0, 0],
              y: currentSceneIndex % 5 === 0 ? [-15, 15] : currentSceneIndex % 5 === 1 ? [15, -15] : [0, 0]
            }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ 
              opacity: { duration: 0.8, ease: "easeOut" },
              scale: { duration: 12, ease: "linear" },
              x: { duration: 15, ease: "linear" },
              y: { duration: 18, ease: "linear" }
            }}
            className="w-full h-full absolute inset-0"
          >
            {scenes[currentSceneIndex]?.imageUrl ? (
              <img 
                src={scenes[currentSceneIndex].imageUrl} 
                alt={`Scene ${currentSceneIndex + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                <span className="text-[10px] font-black uppercase text-zinc-700 tracking-widest animate-pulse">Rendering Visual Layer...</span>
              </div>
            )}
            
            {/* Cinematic Overlay Blur */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Captions / Narration Overlay REMOVED */}

      {/* Center UI */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] cursor-pointer z-20"
          >
            <div className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
              <Play size={32} className="ml-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className={`absolute top-0 inset-x-0 p-6 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-500 z-30 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div>
              <h3 className="text-white text-xs font-black uppercase tracking-tighter italic">{title || 'Cinematic Production'}</h3>
              <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">Neural Render v3.0</p>
             </div>
          </div>
          {onDownload && (
            <button 
              onClick={onDownload}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <Download size={14} />
              Export 4K
            </button>
          )}
        </div>
      </div>

      {/* Bottom Bar Controls */}
      <div className={`absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-500 z-30 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
        <div className="space-y-4">
          <div className="relative h-1 hover:h-1.5 transition-all bg-white/20 rounded-full overflow-hidden">
            <input
              type="range"
              min="0"
              max="100"
              value={progress || 0}
              onChange={handleSeek}
              className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
            />
            <div 
              className="h-full bg-blue-500 transition-all duration-100" 
              style={{ width: `${progress}%` }} 
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform">
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
              
              <div className="flex items-center gap-2 group/volume">
                <button onClick={() => setIsMuted(!isMuted)} className="text-white">
                  {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-0 group-hover/volume:w-16 transition-all accent-blue-500 h-1"
                />
              </div>

              <span className="text-[10px] font-black text-white/50 tracking-widest font-mono">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">
                SCENE {currentSceneIndex + 1} OF {scenes.length}
              </span>
              <button 
                onClick={() => { 
                  pauseTimeRef.current = 0;
                  setCurrentTime(0);
                  setProgress(0);
                  if (isPlaying) {
                    setIsPlaying(false);
                    setTimeout(togglePlay, 10);
                  }
                }}
                className="text-white/60 hover:text-white transition-colors"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
