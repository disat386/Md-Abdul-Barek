import React from 'react';
import { ScrollText, Search, Zap, CheckCircle2, TrendingUp, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ScriptAura() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 md:space-y-12 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div className="space-y-2 md:space-y-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-2 md:p-3 bg-green-500/20 rounded-xl md:rounded-2xl">
              <ScrollText className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase italic">ScriptAura</h1>
          </div>
          <p className="text-xs md:text-sm text-zinc-500 font-medium max-w-xl">
            SEO & Script Research Agent. Analyze trends, generate titles, and build high-retention content structures.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {[
          { title: 'Trend Analyzer', desc: 'Find viral topics in your niche.', icon: TrendingUp, color: 'text-blue-500' },
          { title: 'SEO Optimizer', desc: 'Generate tags and descriptions.', icon: Search, color: 'text-green-500' },
          { title: 'Fast Hooks', desc: 'Craft the perfect video intro.', icon: Zap, color: 'text-orange-500' },
        ].map((item, i) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            key={item.title}
            className="bg-zinc-900 border border-white/5 p-8 rounded-3xl space-y-4 hover:border-white/10 transition-colors group cursor-pointer"
          >
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <item.icon className={cn("w-6 h-6", item.color)} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{item.title}</h3>
              <p className="text-xs text-zinc-500 mt-1 font-medium">{item.desc}</p>
            </div>
            <div className="pt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
              <span>Launch Module</span>
              <Share2 size={12} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-3xl p-12 text-center space-y-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
        <div className="max-w-md mx-auto space-y-4">
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Research Hub</h2>
          <p className="text-zinc-500 text-sm">Our SEO agents are currently processing web data to provide real-time trend analysis. Stay tuned for the full launch.</p>
          <div className="pt-4">
            <button className="px-8 py-3 bg-white text-black font-black uppercase tracking-tighter rounded-xl hover:bg-zinc-200 transition-all opacity-50 cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
