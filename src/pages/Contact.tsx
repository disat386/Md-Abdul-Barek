import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Send, Zap, MessageSquare, ShieldCheck, Globe } from 'lucide-react';

export default function Contact() {
  const [formState, setFormState] = useState({ name: '', email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wasSent, setWasSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setWasSent(true);
      setFormState({ name: '', email: '', subject: '', message: '' });
    }, 1500);
  };

  return (
    <div className="min-h-screen pt-48 pb-32 px-6 relative overflow-hidden bg-zinc-950">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-orange-500 font-mono text-[10px] uppercase tracking-[0.5em] mb-6 inline-block"
          >
            Communication Protocol
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl lg:text-8xl font-display font-black tracking-tight uppercase"
          >
            Get In <span className="text-orange-500">Touch</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/40 max-w-xl mx-auto mt-8 font-light leading-relaxed"
          >
            Whether you are scaling an enterprise AI implementation or have technical inquiries about our ecosystem, the Auurio support team is ready to assist.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-20 items-start">
          {/* Contact Information */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-12"
          >
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="glass-card p-10 rounded-[3rem] border-white/5 bg-white/[0.02]">
                <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <Mail className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-4">Founders Direct</h3>
                <a href="mailto:disat@auurio.com" className="text-lg font-display font-bold text-white hover:text-orange-500 transition-colors">
                  disat@auurio.com
                </a>
              </div>
              
              <div className="glass-card p-10 rounded-[3rem] border-white/5 bg-white/[0.02]">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <MessageSquare className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-4">Support Stack</h3>
                <a href="mailto:help@auurio.com" className="text-lg font-display font-bold text-white hover:text-blue-500 transition-colors">
                  help@auurio.com
                </a>
              </div>
            </div>

            <div className="glass-card p-12 rounded-[4rem] border-white/5 bg-white/[0.01]">
              <h3 className="text-2xl font-display font-black mb-10 tracking-tight uppercase">Platform Details</h3>
              <div className="space-y-8">
                <div className="flex items-start gap-6">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white/80 mb-1">CEO / Principal Architect</h4>
                    <p className="text-sm text-white/40 font-light">Abdul Barek (DIsat)</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-6">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white/80 mb-1">Global Presence</h4>
                    <p className="text-sm text-white/40 font-light">Virtualized across the Auurio Ecosystem Hub</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-6">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white/80 mb-1">Uptime Availability</h4>
                    <p className="text-sm text-white/40 font-light">24/7 AI-Assisted Resolution Services</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-12 lg:p-16 rounded-[4rem] border-white/5 bg-white/[0.02] relative lg:-top-10 shadow-2xl shadow-black"
          >
            {wasSent ? (
              <div className="h-[500px] flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-8 border border-green-500/20">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-10 h-10 text-green-500"
                  >
                    <ShieldCheck className="w-full h-full" />
                  </motion.div>
                </div>
                <h3 className="text-3xl font-display font-black mb-4 uppercase tracking-tight text-white">Transmission Received</h3>
                <p className="text-white/40 max-w-xs font-light leading-relaxed">
                  Your message has been encrypted and sent to our central hub. Our team will decrypt it and respond shortly.
                </p>
                <button 
                  onClick={() => setWasSent(false)}
                  className="mt-10 text-orange-500 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors"
                >
                  New Transmission
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Identity Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. John Smith"
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-orange-500 transition-all font-light"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Protocol Email</label>
                    <input 
                      required
                      type="email" 
                      placeholder="e.g. john@company.com"
                      value={formState.email}
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-orange-500 transition-all font-light"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Message Vector (Subject)</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Subject of inquiry"
                    value={formState.subject}
                    onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-orange-500 transition-all font-light"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Detailed Payload</label>
                  <textarea 
                    required
                    placeholder="Enter your message here..."
                    rows={6}
                    value={formState.message}
                    onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl py-4 px-6 text-sm text-white focus:outline-none focus:border-orange-500 transition-all font-light resize-none"
                  />
                </div>

                <button 
                  disabled={isSubmitting}
                  className="w-full py-6 bg-orange-500 text-black font-black text-[10px] uppercase tracking-[0.4em] rounded-3xl hover:bg-white transition-all duration-500 shadow-xl shadow-orange-500/20 active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full"
                    />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Initiate Transfer
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
