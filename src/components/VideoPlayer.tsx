import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw,
  Download,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  onDownload?: () => void;
  aspectRatio?: 'video' | 'reel';
}

export default function VideoPlayer({ src, poster, title, onDownload, aspectRatio = 'video' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const controlsTimeout = useRef<any>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.load();

    const updateProgress = () => {
      setProgress((video.currentTime / video.duration) * 100);
      setCurrentTime(video.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [src]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (parseFloat(e.target.value) / 100) * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    setProgress(parseFloat(e.target.value));
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
      className={`relative group bg-black rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 ${
        aspectRatio === 'reel' ? 'aspect-[9/16] max-w-[360px] mx-auto border-[8px] border-zinc-900' : 'aspect-video w-full'
      }`}
    >
      <video
        ref={videoRef}
        poster={poster}
        onClick={togglePlay}
        className="w-full h-full object-cover cursor-pointer"
        playsInline
        crossOrigin="anonymous"
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* Center Hero Play Button */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] cursor-pointer"
          >
            <div className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
              <Play size={40} className="ml-2" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay Title */}
      <div className={`absolute top-0 inset-x-0 p-6 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-500 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-black uppercase tracking-tighter italic">{title || 'Production Render'}</h3>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Auurio Platform</p>
          </div>
          <div className="flex gap-2">
            {onDownload && (
              <button 
                onClick={onDownload}
                className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white transition-all"
              >
                <Download size={18} />
              </button>
            )}
            <button className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white transition-all">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={`absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-500 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="relative group/progress h-1 hover:h-2 transition-all">
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleSeek}
              className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
            />
            <div className="absolute inset-0 bg-white/20 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-blue-600 transition-all duration-100`} 
                style={{ width: `${progress}%` }} 
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform">
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
              </button>
              
              <div className="flex items-center gap-2 group/volume">
                <button onClick={toggleMute} className="text-white">
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    if (videoRef.current) {
                      videoRef.current.volume = val;
                      videoRef.current.muted = val === 0;
                    }
                    setIsMuted(val === 0);
                  }}
                  className="w-0 group-hover/volume:w-20 transition-all accent-blue-500 h-1"
                />
              </div>

              <span className="text-[10px] font-black text-white/70 tracking-widest font-mono text-center">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = 0;
                }}
                className="text-white/60 hover:text-white transition-colors"
                title="Restart"
              >
                <RotateCcw size={18} />
              </button>
              <button onClick={toggleFullscreen} className="text-white/60 hover:text-white transition-colors">
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
