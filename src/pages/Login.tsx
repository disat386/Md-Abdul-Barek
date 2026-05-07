import React from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Chrome, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      alert('Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/5 rounded-full blur-[120px]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md text-center space-y-12"
      >
        <div className="space-y-4">
          <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto rotate-12 shadow-2xl shadow-orange-500/20">
            <ShieldCheck className="w-10 h-10 text-black shrink-0" />
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">
            AUURIO Hub
          </h1>
          <p className="text-zinc-500 font-medium max-w-[280px] mx-auto text-sm">
            Professional AI Multimedia Production Platform
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all active:scale-95 group shadow-xl"
          >
            <Chrome className="w-6 h-6" />
            <span>Continue with Google</span>
          </button>
          
          <p className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest">
            Identity secured via Firebase Auth
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-8">
          <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 text-left">
            <p className="text-orange-500 font-black text-lg">100</p>
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Initial Credits</p>
          </div>
          <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 text-left">
            <p className="text-green-500 font-black text-lg">Online</p>
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">System Status</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
