import React from 'react';
import { motion } from 'motion/react';
import { Activity, Zap, Server, Globe, CheckCircle, Clock } from 'lucide-react';

export default function Status() {
  const subsystems = [
    { name: "Audiobook Aura API", status: "Operational", uptime: "99.98%", load: "Low" },
    { name: "Auurio Motion Engine", status: "Operational", uptime: "99.95%", load: "Moderate" },
    { name: "Marketra Crawler", status: "Operational", uptime: "100%", load: "High" },
    { name: "Unified Credit Ledger", status: "Operational", uptime: "100%", load: "Minimal" },
    { name: "Global SSO Hub", status: "Operational", uptime: "99.99%", load: "Minimal" },
    { name: "Gemini Rotation Service", status: "Operational", uptime: "99.92%", load: "Optimal" }
  ];

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4 text-orange-500">
              <Activity className="w-10 h-10" />
              <h1 className="text-5xl font-display font-black uppercase tracking-tight">System Status</h1>
            </div>
            <div className="px-6 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              All Systems Operational
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem]">
              <div className="flex items-center gap-3 mb-6 font-display font-bold text-lg uppercase tracking-wider">
                <Globe className="w-5 h-5 text-orange-500" />
                Global Uptime
              </div>
              <div className="text-6xl font-display font-black text-white mb-2">99.99%</div>
              <div className="text-[10px] uppercase tracking-widest text-white/30">Across all production zones</div>
            </div>
            <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem]">
              <div className="flex items-center gap-3 mb-6 font-display font-bold text-lg uppercase tracking-wider">
                <Clock className="w-5 h-5 text-orange-500" />
                Mean Response
              </div>
              <div className="text-6xl font-display font-black text-white mb-2">124ms</div>
              <div className="text-[10px] uppercase tracking-widest text-white/30">System-wide average latency</div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-8 pl-2">Individual Protocols</h2>
            {subsystems.map((sub, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-2xl group hover:bg-white/[0.05] transition-all"
              >
                <div className="flex flex-col">
                  <span className="font-display font-bold tracking-tight">{sub.name}</span>
                  <span className="text-[10px] text-white/20 font-mono uppercase tracking-widest mt-1">Uptime: {sub.uptime}</span>
                </div>
                <div className="flex items-center gap-8">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-[10px] text-white/20 uppercase tracking-widest mb-1">Load Status</span>
                    <span className={`text-[10px] font-black uppercase ${sub.load === 'High' ? 'text-red-500' : 'text-orange-500'}`}>{sub.load}</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{sub.status}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-20 p-10 bg-zinc-900 rounded-[3rem] border border-white/5 flex flex-col items-center text-center">
            <Zap className="w-12 h-12 text-orange-500 mb-6" />
            <h3 className="text-xl font-bold mb-4 uppercase tracking-wider">Historical Incident Log</h3>
            <p className="text-sm text-white/30 max-w-lg mb-8 font-light">
              No major incidents reported in the last 90 days. We maintain high availability by distributing workloads across a decentralized cluster of AI processing nodes.
            </p>
            <div className="w-full flex gap-1 h-2 bg-white/5 rounded-full overflow-hidden">
              {[...Array(30)].map((_, i) => (
                <div key={i} className="flex-1 bg-green-500/50 hover:bg-green-500 transition-colors cursor-help" title={`Day ${30-i}: 100.0% availability`} />
              ))}
            </div>
            <div className="w-full flex justify-between mt-2 text-[10px] font-mono text-white/10 uppercase italic">
              <span>90 Days Ago</span>
              <span>Today</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
