import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Eye, Lock, FileText, Globe, Server } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-4 mb-8 text-orange-500">
            <ShieldAlert className="w-10 h-10" />
            <h1 className="text-5xl font-display font-black uppercase tracking-tight">Privacy Policy</h1>
          </div>

          <section className="prose prose-invert max-w-none space-y-12">
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Data Stewardship Protocol</h2>
              <p className="text-white/60 leading-relaxed">
                At Auurio, your intellectual property and data privacy are paramount. This policy outlines how we collect, process, and safeguard information across the Auurio Ecosystem. By using our tools, you agree to the data handling procedures described herein.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Lock, title: "Encryption", desc: "All data transfers use TLS 1.3 encryption protocols." },
                { icon: Eye, title: "Transparency", desc: "Explicit logs are provided for every credit transaction." },
                { icon: Server, title: "Persistence", desc: "Production assets are stored in isolated encrypted buckets." }
              ].map((item, i) => (
                <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                  <item.icon className="w-6 h-6 text-orange-500 mb-4" />
                  <h3 className="font-bold mb-2 uppercase text-xs tracking-widest">{item.title}</h3>
                  <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-white/5">
                  <FileText className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">1. Data Collection</h3>
                  <p className="text-sm text-white/40 leading-relaxed">
                    We collect essential profile information (email, name) and usage telemetry to optimize your AI generation experience. We do not sell your personal data to third-party advertisers.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-white/5">
                  <Globe className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">2. Cross-Border Transfers</h3>
                  <p className="text-sm text-white/40 leading-relaxed">
                    As a global ecosystem, your data may be processed on servers located outside your jurisdiction. We ensure all regional cloud providers comply with stringent international data protection standards.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-zinc-900 border border-white/5 rounded-3xl text-sm font-mono text-white/40 italic">
              "Privacy is not just a feature; it is the foundation of digital sovereignty in the age of generative intelligence." // Auurio Core Principles
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
