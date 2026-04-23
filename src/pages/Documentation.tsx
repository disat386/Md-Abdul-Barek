import React from 'react';
import { motion } from 'motion/react';
import { Book, Code, Zap, Shield, Workflow, MessageSquare } from 'lucide-react';

export default function Documentation() {
  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-4 mb-8 text-orange-500">
            <Book className="w-10 h-10" />
            <h1 className="text-5xl font-display font-black uppercase tracking-tight">Documentation</h1>
          </div>

          <section className="prose prose-invert max-w-none space-y-12">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
                <Zap className="w-6 h-6 text-orange-500" />
                The Auurio Protocol
              </h2>
              <p className="text-white/60 leading-relaxed">
                Welcome to the official technical documentation for the Auurio Ecosystem. Auurio is a state-of-the-art AI-driven production environment designed for professional creators, marketers, and developers. Our ecosystem centralizes high-performance AI tools under a unified credit system and single sign-on (SSO) architecture.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 bg-white/5 border border-white/10 rounded-3xl">
                <Workflow className="w-8 h-8 text-orange-500 mb-6" />
                <h3 className="text-xl font-bold mb-4 uppercase tracking-wider">Unifed Credit Pool</h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  Learn how our cross-protocol ledger works. Credits acquired on any Auurio platform are instantly available across all subdomains including Audiobook Aura, Motion, and Marketra.
                </p>
              </div>
              <div className="p-8 bg-white/5 border border-white/10 rounded-3xl">
                <Shield className="w-8 h-8 text-orange-500 mb-6" />
                <h3 className="text-xl font-bold mb-4 uppercase tracking-wider">SSO Implementation</h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  Our single sign-on system ensures your session is synchronized globally. Move between specialized research labs and production environments with zero friction.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
                <Code className="w-6 h-6 text-orange-500" />
                API Integration
              </h2>
              <p className="text-white/60 leading-relaxed mb-6">
                Developers can leverage the Auurio backend for custom workflows. We support both REST and WebSocket interfaces for real-time AI generation tracking and asset management.
              </p>
              <div className="bg-zinc-900 rounded-2xl p-6 font-mono text-xs text-orange-500/80 border border-white/5">
                $ curl -X POST https://api.auurio.com/v1/generate \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer YOUR_SSO_TOKEN" \<br />
                &nbsp;&nbsp;-d '{"{"}"protocol": "audiobook-aura", "manuscript": "..."{"}"}'
              </div>
            </div>

            <div className="p-10 bg-orange-500/10 border border-orange-500/20 rounded-[3rem] text-center">
              <MessageSquare className="w-12 h-12 text-orange-500 mx-auto mb-6" />
              <h2 className="text-2xl font-black uppercase mb-4">Technical Support</h2>
              <p className="text-white/60 mb-8 max-w-lg mx-auto">
                Need deep technical assistance or enterprise onboarding? Our engineering team is available for real-time consultations via the ecosystem's secure support protocols.
              </p>
              <a href="https://wa.me/8801303531386" className="inline-block bg-orange-500 text-black px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white transition-colors">
                Contact Engineering
              </a>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
