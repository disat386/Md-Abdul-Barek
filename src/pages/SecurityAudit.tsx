import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Activity, Terminal, Cpu, Database } from 'lucide-react';

export default function SecurityAudit() {
  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-4 mb-8 text-orange-500">
            <ShieldCheck className="w-10 h-10" />
            <h1 className="text-5xl font-display font-black uppercase tracking-tight">Security Audit</h1>
          </div>

          <section className="prose prose-invert max-w-none space-y-12">
            <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10">
                <Activity className="w-12 h-12 text-orange-500/20" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-6">Real-Time Threat Intelligence</h2>
              <p className="text-white/60 leading-relaxed mb-8 font-light">
                The Auurio Ecosystem operates on a multi-layer security architecture. Every subsystem is continuously monitored by our automated security protocols to prevent unauthorized access and ensure the integrity of the unified credit pool.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Firewall", status: "Active", val: "99.9%" },
                  { label: "Encryption", status: "TLS 1.3", val: "256-bit" },
                  { label: "Monitoring", status: "Live", val: "24/7" },
                  { label: "DDoS Guard", status: "Enabled", val: "10Tbps" }
                ].map((stat, i) => (
                  <div key={i} className="p-4 bg-black rounded-2xl border border-white/5 text-center">
                    <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">{stat.label}</div>
                    <div className="text-sm font-bold text-orange-500">{stat.val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Terminal className="w-6 h-6 text-orange-500" />
                Infrastructure Hardening
              </h2>
              <div className="space-y-6">
                {[
                  { icon: Cpu, title: "Isolated Compute Nodes", desc: "AI generation takes place in single-tenant isolated containers to prevent cross-contamination of user data." },
                  { icon: Database, title: "Redundant Storage", desc: "Production assets are mirrored across three distinct geographical regions with point-in-time recovery enabled." },
                  { icon: Lock, title: "Hardware Security Modules (HSM)", desc: "All API keys and rotation triggers are managed within military-grade HSM environments." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                      <item.icon className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-1 tracking-tight">{item.title}</h3>
                      <p className="text-sm text-white/40 leading-relaxed font-light">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 bg-zinc-900 border border-white/5 rounded-3xl">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/60 mb-4">Latest Audit Report</h3>
              <div className="space-y-2 font-mono text-[10px] text-orange-500/60 leading-relaxed">
                <div>[2026-06-15 09:12:44] System integrity check: OK</div>
                <div>[2026-06-15 10:05:01] Vulnerability scan: ZERO FOUND</div>
                <div>[2026-06-15 11:22:15] Credit ledger reconciliation: COMPLETE</div>
                <div className="animate-pulse">[LIVE] Active intrusion detection: MONITORING</div>
              </div>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
