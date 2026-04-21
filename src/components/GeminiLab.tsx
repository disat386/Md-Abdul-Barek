import { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Send, Loader2, Brain, Zap, Image as ImageIcon, Code, Type, X } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface GeminiLabProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GeminiLab = ({ isOpen, onClose }: GeminiLabProps) => {
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'analysis'>('text');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');

  const models = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', desc: 'Fast, efficient, and great for common tasks.', type: 'Free Tier' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', desc: 'Complex reasoning and high-level tasks.', type: 'Free Tier' },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    setResult('');

    try {
      if (activeTab === 'text') {
        const response = await ai.models.generateContent({
          model: selectedModel,
          contents: prompt,
        });
        setResult(response.text || 'No response generated.');
      } else if (activeTab === 'image') {
        // Nano banana models for image generation
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: prompt }] },
        });
        
        let imageUrl = '';
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                break;
            }
        }
        setResult(imageUrl || 'Failed to generate image.');
      }
    } catch (error) {
      console.error('Gemini Lab Error:', error);
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-5xl h-[80vh] bg-zinc-900 border border-white/10 rounded-[3rem] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <FlaskConical className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold uppercase tracking-tight">Gemini Innovation Lab</h2>
              <p className="text-xs text-white/40 font-mono">POWERED BY GOOGLE AI STUDIO FREE TIER</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-white/5 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-white/5 p-6 space-y-2 hidden md:block bg-white/[0.01]">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/20 mb-4 px-2">MODALITIES</div>
            <button 
              onClick={() => setActiveTab('text')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'text' ? 'bg-orange-500 text-black font-bold' : 'hover:bg-white/5 text-white/60'}`}
            >
              <Type className="w-5 h-5" />
              <span className="text-sm">Text Gen</span>
            </button>
            <button 
              onClick={() => setActiveTab('image')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'image' ? 'bg-orange-500 text-black font-bold' : 'hover:bg-white/5 text-white/60'}`}
            >
              <ImageIcon className="w-5 h-5" />
              <span className="text-sm">Image Gen</span>
            </button>
            
            <div className="pt-8 text-[10px] uppercase tracking-[0.2em] text-white/20 mb-4 px-2">MODEL SELECTION</div>
            {models.map(model => (
              <button 
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={`w-full text-left p-3 rounded-xl transition-all border ${selectedModel === model.id ? 'border-orange-500/50 bg-orange-500/5 shadow-lg' : 'border-transparent hover:bg-white/5 opacity-60'}`}
              >
                <div className="text-xs font-bold mb-1">{model.name}</div>
                <div className="text-[10px] opacity-60 leading-tight">{model.desc}</div>
              </button>
            ))}
          </div>

          {/* Main Area */}
          <div className="flex-1 flex flex-col p-8 bg-zinc-900/50">
            {/* Input Area */}
            <div className="mb-8">
              <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 block">Configure Prompt</label>
              <div className="relative">
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={activeTab === 'text' ? "Describe what you want to generate..." : "A futuristic city in the clouds, neon lights, 4k..."}
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 text-white text-sm focus:outline-none focus:border-orange-500/50 transition-all resize-none shadow-inner"
                />
                <button 
                  disabled={isLoading || !prompt.trim()}
                  onClick={handleGenerate}
                  className="absolute bottom-4 right-4 bg-orange-500 text-black px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                  Execute
                </button>
              </div>
            </div>

            {/* Output Area */}
            <div className="flex-1 flex flex-col">
              <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 block">Response Output</label>
              <div className="flex-1 bg-black/40 border border-white/5 rounded-3xl p-8 overflow-y-auto font-light leading-relaxed text-white/80 selection:bg-orange-500/30">
                {isLoading ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-white/20">
                    <Brain className="w-12 h-12 animate-pulse" />
                    <span className="text-xs uppercase tracking-[0.2em]">Synthesizing Neural Patterns...</span>
                  </div>
                ) : result ? (
                  activeTab === 'image' && result.startsWith('data:') ? (
                    <div className="h-full flex items-center justify-center">
                      <img 
                        src={result} 
                        alt="Generated" 
                        className="max-h-full rounded-2xl shadow-2xl border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{result}</div>
                  )
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-white/10 italic">
                    <Code className="w-8 h-8" />
                    <span className="text-xs">Awaiting execution sequence...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Gateway: Active</span>
            </div>
            <div className="text-[10px] text-white/20 uppercase tracking-widest font-mono">Latency: 42ms</div>
          </div>
          <div className="text-[10px] text-white/40 uppercase tracking-widest font-mono">
            Model: {selectedModel}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const FlaskConical = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M10 2v7.5" />
    <path d="M14 2v7.5" />
    <path d="M8.5 2h7" />
    <path d="M14 11.5c.571.429.571 1.429 0 2.858a2.53 2.53 0 0 1-2.43 1.642H12.43a2.53 2.53 0 0 1-2.43-1.642c-.571-1.429-.571-2.429 0-2.858" />
    <path d="M20 18.5a2.5 2.5 0 0 1-2.5 2.5h-11a2.5 2.5 0 0 1-2.5-2.5c0-1.429.571-4.858 2.5-8.5l2.5-4.5h6l2.5 4.5c1.929 3.642 2.5 7.071 2.5 8.5z" />
  </svg>
);
