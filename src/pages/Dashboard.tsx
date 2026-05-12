import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  ChevronRight, 
  History, 
  Trophy, 
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  Coins,
  CreditCard,
  X,
  Smartphone,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCredits } from '../utils';
import Activity from '../components/Activity';
import { cn } from '../utils';
import { collection, onSnapshot, doc, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

export default function Dashboard({ profile }: { profile: any }) {
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpData, setTopUpData] = useState({ amount: 999, method: 'bkash', txId: '', number: '', coupon: '' });
  const [discount, setDiscount] = useState(0);
  const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) setSettings(snap.data());
    });
    return () => unsub();
  }, []);

  const handleTopUpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpData.txId || !topUpData.number) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'payments'), {
        userId: profile.uid,
        userEmail: profile.email,
        amount: topUpData.amount,
        finalAmount: Math.max(0, topUpData.amount - discount),
        credits: topUpData.amount * 5, // Simple calc for now
        method: topUpData.method,
        transactionId: topUpData.txId,
        senderNumber: topUpData.number,
        couponCode: topUpData.coupon,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      alert("Top-up request submitted! Admin will verify shortly.");
      setShowTopUp(false);
    } catch (err) {
      alert("Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cards = [
    { title: 'Current Credits', value: profile?.credits?.toLocaleString() || '0', icon: Coins, color: 'text-yellow-500' },
    { title: 'Content Created', value: '12', icon: Sparkles, color: 'text-orange-500' },
    { title: 'Ecosystem Rank', value: profile?.role === 'user' ? 'Member' : 'Elite', icon: Trophy, color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-6 md:space-y-12 pb-24 md:pb-8">
      <div className="space-y-1 md:space-y-2">
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase italic">
          Overview
        </h1>
        <p className="text-xs md:text-base text-zinc-500 font-medium">Track your production activity and ecosystem metrics.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {cards.map((card, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={card.title}
            className="bg-zinc-900 border border-white/5 p-6 md:p-8 rounded-2xl md:rounded-3xl relative overflow-hidden group hover:border-white/10 transition-colors"
          >
            <div className="relative z-10 space-y-3 md:space-y-4">
              <div className="flex items-center justify-between">
                <card.icon className={cn("w-6 h-6 md:w-8 md:h-8", card.color)} />
                <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-zinc-700 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-2xl md:text-4xl font-black text-white tracking-tighter">{card.value}</p>
                <p className="text-[8px] md:text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">{card.title}</p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
        {/* Recent Activity Module */}
        <div className="lg:col-span-3 space-y-6">
          <Activity userId={profile?.uid} />
        </div>

        {/* Quick Start Sidebar */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-white/5 rounded-3xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-xl">
                  <Coins className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Balance</p>
                  <p className="text-xl font-black text-white tracking-tighter">{profile?.credits?.toLocaleString() || 0}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTopUp(true)}
                className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-tighter rounded-xl hover:bg-zinc-200 transition-all active:scale-95"
              >
                Top up
              </button>
            </div>
          </div>

          {profile?.role && profile.role !== 'user' && (
            <div 
              onClick={() => window.location.href = '/admin'}
              className="bg-blue-500/10 border border-blue-500/20 rounded-3xl p-8 flex flex-col justify-between group cursor-pointer relative overflow-hidden h-[180px]"
            >
              <div className="relative z-10 space-y-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-xl">
                  <ShieldCheck className="text-white w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-blue-500 uppercase italic tracking-tighter">AI Management</h3>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Manage API Keys & Pool</p>
                </div>
              </div>
              <div className="relative z-10 flex items-center justify-between text-blue-500 font-black uppercase text-[10px] tracking-widest">
                <span>Configure Keys</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          )}

          <div className="bg-orange-500 rounded-3xl p-8 flex flex-col justify-between group cursor-pointer relative overflow-hidden min-h-[300px]" onClick={() => window.location.href = '/cine'}>
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-xl">
                <Zap className="text-orange-500 w-6 h-6 fill-orange-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-black leading-tight uppercase italic tracking-tighter">Generate Content</h3>
                <p className="text-black/60 text-xs font-bold uppercase tracking-widest">Instant Production Hub</p>
              </div>
            </div>
            
            <div className="relative z-10 flex items-center justify-between text-black font-black uppercase text-xs tracking-widest bg-black/20 p-4 rounded-2xl border border-black/10">
              <span>Launch CineAura</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>

            <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-white/20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-500" />
          </div>

          <div className="glass-panel rounded-3xl p-8 space-y-6">
            <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Ecosystem News</h4>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-orange-500 uppercase mb-1">Update v2.4</p>
                <p className="text-xs font-bold text-white leading-relaxed">Multimodal Image fallback system now online. Enhanced stability for high-resolution frames.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showTopUp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTopUp(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-white/10 w-full max-w-lg rounded-[40px] p-8 md:p-10 relative z-10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-500/10 rounded-2xl">
                    <CreditCard className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">Top up Credits</h3>
                </div>
                <button onClick={() => setShowTopUp(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleTopUpRequest} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    onClick={() => setTopUpData({...topUpData, method: 'bkash'})}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col items-center gap-2",
                      topUpData.method === 'bkash' ? "bg-pink-500/10 border-pink-500 text-pink-500" : "bg-black border-white/5 text-zinc-500"
                    )}
                  >
                    <Smartphone className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">bKash</span>
                  </div>
                  <div 
                    onClick={() => setTopUpData({...topUpData, method: 'nagad'})}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col items-center gap-2",
                      topUpData.method === 'nagad' ? "bg-red-500/10 border-red-500 text-red-500" : "bg-black border-white/5 text-zinc-500"
                    )}
                  >
                    <Smartphone className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Nagad</span>
                  </div>
                </div>

                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                   <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mb-1">Payment Instructions</p>
                   <p className="text-xs text-white leading-relaxed font-medium mb-2">
                     Send <span className="text-orange-500 font-black">৳{Math.max(0, topUpData.amount - discount)}</span> to <span className="font-bold underline">{topUpData.method === 'bkash' ? settings?.bkashNumber : settings?.nagadNumber}</span> then provide details below.
                   </p>
                   {discount > 0 && (
                     <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                       (৳{topUpData.amount} original - ৳{discount} discount)
                     </div>
                   )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Select Amount</label>
                    <select 
                      value={topUpData.amount}
                      onChange={(e) => setTopUpData({...topUpData, amount: parseInt(e.target.value)})}
                      className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-orange-500 transition-all text-sm font-bold uppercase tracking-widest"
                    >
                      <option value={999}>৳999 (5,000 Credits)</option>
                      <option value={2499}>৳2,499 (15,000 Credits)</option>
                      <option value={5999}>৳5,999 (45,000 Credits)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Coupon Code (Optional)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={topUpData.coupon}
                        onChange={(e) => {
                          setTopUpData({...topUpData, coupon: e.target.value});
                          setDiscount(0);
                        }}
                        className="flex-1 bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-orange-500 transition-all text-sm uppercase"
                        placeholder="ENTER CODE"
                      />
                      <button 
                        type="button"
                        onClick={async () => {
                          if (!topUpData.coupon) return;
                          setIsVerifyingCoupon(true);
                          try {
                            const q = query(collection(db, 'coupons'), where('code', '==', topUpData.coupon.toUpperCase()));
                            const snap = await getDocs(q);
                            if (snap.empty) {
                              alert("Invalid coupon");
                            } else {
                              const c = snap.docs[0].data();
                              const disc = c.discountType === 'percent' ? (topUpData.amount * c.value / 100) : c.value;
                              setDiscount(disc);
                              alert(`Coupon applied: ৳${disc} off`);
                            }
                          } catch (err) {
                            alert("Verification error");
                          } finally {
                            setIsVerifyingCoupon(false);
                          }
                        }}
                        className="px-6 bg-zinc-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Your Number</label>
                      <input 
                        type="text" 
                        required
                        value={topUpData.number}
                        onChange={(e) => setTopUpData({...topUpData, number: e.target.value})}
                        className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-orange-500 transition-all text-sm"
                        placeholder="017xxxxxxxx"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Transaction ID</label>
                      <input 
                        type="text" 
                        required
                        value={topUpData.txId}
                        onChange={(e) => setTopUpData({...topUpData, txId: e.target.value})}
                        className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-orange-500 transition-all text-sm"
                        placeholder="TXN12345678"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-white text-black font-black uppercase tracking-tighter rounded-2xl hover:bg-zinc-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Confirm Payment
                      <ArrowUpRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


