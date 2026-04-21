import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, CheckCircle, ShieldAlert } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from './FirebaseProvider';

export function BillingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, profile } = useFirebase();
  const [packages, setPackages] = useState<any[]>([]);
  const [bkashNumber, setBkashNumber] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const pkgSnap = await getDocs(collection(db, 'packages'));
      setPackages(pkgSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const settingsSnap = await getDocs(collection(db, 'settings'));
      const paymentDoc = settingsSnap.docs.find(d => d.id === 'payment');
      if (paymentDoc) {
        setBkashNumber(paymentDoc.data().bkashNumber);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !profile) return;

    if (!profile.phoneNumber || profile.phoneNumber.trim().length < 5) {
      setMessage({ text: 'Please add a valid Phone Number to your profile before making a purchase.', type: 'error' });
      return;
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const senderNumber = formData.get('senderNumber') as string;
    const transactionId = formData.get('transactionId') as string;

    try {
      await addDoc(collection(db, 'transactions'), {
        uid: user.uid,
        userEmail: user.email,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        amount: selectedPackage.price,
        credits: selectedPackage.credits,
        senderNumber,
        transactionId,
        status: 'pending',
        timestamp: serverTimestamp()
      });

      setMessage({ text: 'Transaction submitted successfully! Please wait for admin approval.', type: 'success' });
      setTimeout(() => {
        onClose();
        setSelectedPackage(null);
        setMessage({ text: '', type: '' });
      }, 3000);
    } catch (error) {
      setMessage({ text: 'Failed to submit transaction. Please try again.', type: 'error' });
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-2xl w-full relative overflow-y-auto max-h-[90vh]"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-3xl font-bold mb-2">Buy Credits</h2>
          <p className="text-white/60 mb-8">Purchase credits via bKash to use across the Auurio ecosystem.</p>

          {(!profile?.phoneNumber || profile.phoneNumber.trim().length < 5) && (
            <div className="mb-8 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-orange-500">Phone Number Required</h4>
                <p className="text-xs text-white/60 leading-relaxed mt-1">
                  To ensure secure transactions, you must add your phone number to your profile before purchasing credits.
                </p>
              </div>
            </div>
          )}

          {message.text && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              {message.text}
            </div>
          )}

          {!selectedPackage ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages.map(pkg => (
                <div 
                  key={pkg.id} 
                  onClick={() => setSelectedPackage(pkg)}
                  className="p-6 border border-white/10 rounded-2xl bg-white/5 hover:bg-white/10 hover:border-orange-500/50 cursor-pointer transition-all group"
                >
                  <h3 className="text-xl font-bold mb-2 group-hover:text-orange-500 transition-colors">{pkg.name}</h3>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-3xl font-bold text-white">৳{pkg.price}</span>
                  </div>
                  <div className="flex items-center gap-2 text-orange-500 font-mono bg-orange-500/10 w-fit px-3 py-1 rounded-full text-sm">
                    <CreditCard className="w-4 h-4" />
                    {pkg.credits} Credits
                  </div>
                </div>
              ))}
              {packages.length === 0 && (
                <div className="col-span-2 text-center py-12 text-white/40">
                  No packages available at the moment.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-orange-500">{selectedPackage.name}</h3>
                  <p className="text-sm text-white/60">{selectedPackage.credits} Credits</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold">৳{selectedPackage.price}</span>
                </div>
              </div>

              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                <h4 className="font-bold mb-4 flex items-center gap-2">
                  <span className="bg-pink-500 text-white text-xs px-2 py-1 rounded font-bold">bKash</span>
                  Payment Instructions
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-white/80 mb-6">
                  <li>Go to your bKash app.</li>
                  <li>Select <strong>Send Money</strong> (or Cash Out if it's an Agent number).</li>
                  <li>Enter the number: <span className="font-mono text-orange-500 font-bold text-lg ml-2">{bkashNumber || 'Not configured'}</span></li>
                  <li>Enter the exact amount: <strong>৳{selectedPackage.price}</strong></li>
                  <li>Complete the transaction and copy the <strong>Transaction ID (TrxID)</strong>.</li>
                </ol>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Your bKash Number (Sender)</label>
                    <input
                      name="senderNumber"
                      type="text"
                      required
                      className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                      placeholder="017XXXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Transaction ID (TrxID)</label>
                    <input
                      name="transactionId"
                      type="text"
                      required
                      className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 font-mono uppercase"
                      placeholder="8A7B6C5D4E"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setSelectedPackage(null)}
                      className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      type="submit" 
                      disabled={loading || !bkashNumber}
                      className="flex-1 py-3 rounded-xl bg-orange-500 text-black hover:bg-orange-400 font-bold transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Submitting...' : 'Submit Payment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
