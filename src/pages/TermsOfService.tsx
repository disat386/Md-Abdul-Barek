import React from 'react';
import { motion } from 'motion/react';
import { Gavel, Scale, AlertCircle, CheckCircle, Zap, ShieldCheck } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-4 mb-8 text-orange-500">
            <Gavel className="w-10 h-10" />
            <h1 className="text-5xl font-display font-black uppercase tracking-tight">Terms of Protocol</h1>
          </div>

          <section className="prose prose-invert max-w-none space-y-12">
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Service Level Agreement & Usage Terms</h2>
              <p className="text-white/60 leading-relaxed">
                By accessing Auurio or any tool within the ecosystem, you agree to abide by these terms. Our protocols are designed to maintain system integrity and ensure fair access to compute resources for all authorized users.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 bg-white/5 border border-white/10 rounded-[3rem] space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold uppercase tracking-wider">Acceptable Use</h3>
                <ul className="text-sm text-white/40 space-y-4 font-light">
                  <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" /> No automated scraping of ecosystem tools.</li>
                  <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" /> Lawful use of AI-generated content.</li>
                  <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" /> Responsible credit management.</li>
                </ul>
              </div>

              <div className="p-8 bg-white/5 border border-white/10 rounded-[3rem] space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold uppercase tracking-wider">Limitations</h3>
                <ul className="text-sm text-white/40 space-y-4 font-light">
                  <li className="flex gap-3"><AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" /> Generation results are AI-dependent and vary.</li>
                  <li className="flex gap-3"><AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" /> Accounts may be suspended for abuse.</li>
                  <li className="flex gap-3"><AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" /> Credits are non-refundable once initialized.</li>
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-orange-500" />
                Intellectual Property
              </h2>
              <p className="text-white/60 leading-relaxed">
                Users retain full commercial ownership of the outputs generated through Audiobook Aura, Motion, and other creative protocols, provided they are on a valid production-tier plan. Auurio retains rights to the underlying model architectures and platform infrastructure.
              </p>
            </div>

            <div className="flex items-center gap-4 p-6 bg-orange-500/5 rounded-2xl border border-orange-500/10 text-xs text-white/40 italic">
              <Scale className="w-4 h-4 text-orange-500" />
              This protocol is governed by international digital commerce regulations as of June 2026.
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
