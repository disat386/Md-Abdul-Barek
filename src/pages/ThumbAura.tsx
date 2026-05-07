import React, { useState } from 'react';
import { 
  ImageIcon, 
  Sparkles, 
  Maximize, 
  Download, 
  Loader2, 
  Layers,
  RectangleVertical,
  LayoutGrid
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { creditService, CREDIT_COSTS } from '../services/creditService';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';

export default function ThumbAura({ profile }: { profile: any }) {
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState('16:9');
  const [imageUrl, setImageUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt) return;
    
    setError('');
    setIsGenerating(true);

    try {
      const hasCredits = await creditService.checkBalance(profile.uid, CREDIT_COSTS.IMAGE_GENERATION);
      if (!hasCredits) throw new Error('Insufficient credits.');

      // Use Imagen 3.0 as per service implementation
      const url = await aiService.generateImage(`${prompt}. Professional thumbnail, high contrast, cinematic lighting, style: ${ratio === '16:9' ? 'landscape' : 'portrait'}`, {
        width: ratio === '16:9' ? 1280 : 720,
        height: ratio === '16:9' ? 720 : 1280
      });
      
      setImageUrl(url);
      await creditService.deduct(profile.uid, CREDIT_COSTS.IMAGE_GENERATION, 'THUMBNAIL_GENERATION');
      
      await addDoc(collection(db, 'designs'), {
        userId: profile.uid,
        prompt,
        aspectRatio: ratio,
        imageUrl: url,
        createdAt: serverTimestamp()
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await addDoc(collection(db, 'projects'), {
        userId: profile.uid,
        title: prompt.substring(0, 30) + (prompt.length > 30 ? '...' : ''),
        topic: prompt,
        type: 'thumb',
        status: 'completed',
        progress: 100,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 md:space-y-12 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div className="space-y-2 md:space-y-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-2 md:p-3 bg-purple-500/20 rounded-xl md:rounded-2xl">
              <ImageIcon className="w-6 h-6 md:w-8 md:h-8 text-purple-500" />
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase italic">ThumbAura</h1>
          </div>
          <p className="text-xs md:text-sm text-zinc-500 font-medium max-w-xl">
            Cinematic visuals for high-clickthrough thumbnails and cinematic storytelling.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl w-fit">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-widest">{CREDIT_COSTS.IMAGE_GENERATION} Credits</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-4 space-y-4 md:space-y-6">
          <div className="bg-zinc-900 border border-white/5 p-4 md:p-6 rounded-2xl md:rounded-3xl space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Visual Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A lone warrior standing before a golden temple in a misty valley..."
                className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-purple-500 outline-none transition-all h-32 resizable-none"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: '16:9', label: 'Landscape', icon: Maximize },
                  { id: '9:16', label: 'Portrait', icon: RectangleVertical }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setRatio(item.id)}
                    className={cn(
                      "flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black uppercase tracking-tighter transition-all",
                      ratio === item.id ? "bg-purple-500/10 border-purple-500 text-purple-500" : "bg-black border-white/5 text-zinc-500 hover:border-white/20"
                    )}
                  >
                    <item.icon size={14} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt}
              className="w-full py-4 bg-purple-600 text-white font-black uppercase tracking-tighter flex items-center justify-center gap-2 rounded-2xl hover:bg-purple-500 transition-all active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Manifesting...</span>
                </>
              ) : (
                <>
                  <Layers className="w-5 h-5" />
                  <span>Generate Vision</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden aspect-[16/9] relative group">
            {imageUrl ? (
              <>
                <img src={imageUrl} alt="Generated" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <a 
                    href={imageUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-4 bg-white text-black rounded-full hover:scale-110 transition-transform"
                  >
                    <Download className="w-6 h-6" />
                  </a>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30 select-none">
                <div className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center">
                  <LayoutGrid className="w-10 h-10 text-zinc-500" />
                </div>
                <div>
                  <p className="text-lg font-black uppercase tracking-tighter text-white">Visual Stage</p>
                  <p className="text-sm font-medium mt-1">Your AI generated assets will appear here</p>
                </div>
              </div>
            )}
            {isGenerating && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-white rounded-full animate-spin" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Simulating Reality...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
