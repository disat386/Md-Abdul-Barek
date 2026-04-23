import { motion, AnimatePresence } from 'motion/react';
import { X, Send, MessageSquareHeart, Star } from 'lucide-react';
import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from './FirebaseProvider';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user } = useFirebase();
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && rating === 0) {
      setError('Please provide a rating or some feedback.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, 'feedback'), {
        uid: user?.uid || 'anonymous',
        email: user?.email || 'anonymous',
        message: message.trim(),
        rating,
        timestamp: serverTimestamp(),
        status: 'new' // Useful for admin dashboard review
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setMessage('');
        setRating(0);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4">
              <button
                onClick={onClose}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-pink-500/10 rounded-2xl flex items-center justify-center border border-pink-500/20">
                <MessageSquareHeart className="w-6 h-6 text-pink-500" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-white">We Value Your Feedback</h2>
                <p className="text-sm text-white/50">Help us improve your experience</p>
              </div>
            </div>

            {success ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="flex items-center justify-center py-12 text-green-400"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                    <Send className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold">Thank You!</h3>
                  <p className="text-white/50 mt-2">Your feedback has been submitted.</p>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-3">Rate your experience</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-2 rounded-xl transition-all ${
                          rating >= star 
                            ? 'text-yellow-400 bg-yellow-400/10' 
                            : 'text-white/20 hover:text-white/40 bg-white/5'
                        }`}
                      >
                        <Star className={`w-8 h-8 ${rating >= star ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">What could we do better?</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what you love or what's missing..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-32 resize-none"
                  />
                </div>

                {error && (
                  <div className="text-red-400 text-sm">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Submit Feedback
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
