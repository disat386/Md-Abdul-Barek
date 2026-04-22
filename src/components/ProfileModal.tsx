import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Camera, Mail, ShieldCheck, AlertCircle, Save, Loader2, CheckCircle2, Trash2, Phone } from 'lucide-react';
import { useFirebase } from './FirebaseProvider';
import { updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, deleteUserAccount } = useFirebase();
  const [name, setName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  React.useEffect(() => {
    if (profile) {
      setName(profile.displayName || '');
      setPhotoURL(profile.photoURL || '');
      setPhoneNumber(profile.phoneNumber || '');
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setMessage(null);

    try {
      // 1. Update Auth Profile
      await updateProfile(user, {
        displayName: name,
        photoURL: photoURL
      });

      // 2. Update Firestore Doc
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: name,
        photoURL: photoURL,
        phoneNumber: phoneNumber
      });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Update profile error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendVerification = async () => {
    if (!user) return;
    setIsVerifying(true);
    try {
      await sendEmailVerification(user);
      setMessage({ type: 'success', text: 'Verification email sent! Check your inbox.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send verification email' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await deleteUserAccount();
      onClose();
    } catch (error: any) {
      console.error('Delete account error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to delete account. You may need to re-authenticate.' });
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const avatars = [
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`,
    `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.uid}`,
    `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user?.uid}`,
    `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.uid}`,
    `https://api.dicebear.com/7.x/micah/svg?seed=${user?.uid}`,
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
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
        className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
              <User className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Profile Settings</h2>
              <p className="text-xs text-white/40">Manage your identity and account security</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
          {/* Avatar Section */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Custom Avatar</label>
            <div className="flex flex-wrap gap-4">
              <div className="w-20 h-20 rounded-2xl border-2 border-orange-500 p-1 overflow-hidden bg-white/5">
                <img 
                  src={photoURL || profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
                  alt="Current Avatar" 
                  className="w-full h-full object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 grid grid-cols-5 gap-2">
                {avatars.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoURL(url)}
                    className={`aspect-square rounded-xl border-2 transition-all p-1 hover:scale-105 ${photoURL === url ? 'border-orange-500 bg-orange-500/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                  >
                    <img src={url} alt={`Avatar option ${i}`} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            </div>
            <div className="relative group">
              <Camera className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                type="text"
                placeholder="Or paste image URL..."
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-orange-500 transition-all"
              />
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-white/40">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input 
                  required
                  type="text"
                  placeholder="Your display name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-white/40">Phone Number (Required for purchases)</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input 
                  type="tel"
                  placeholder="e.g., +88017XXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-orange-500 transition-all font-mono"
                />
              </div>
            </div>

            {/* Verification Section */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-white/40" />
                  <div>
                    <h4 className="text-sm font-bold">Email Address</h4>
                    <p className="text-xs text-white/40">{user?.email}</p>
                  </div>
                </div>
                {user?.emailVerified ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-[10px] font-bold uppercase">
                    <AlertCircle className="w-3 h-3" />
                    Unverified
                  </div>
                )}
              </div>
              
              {!user?.emailVerified && (
                <button
                  type="button"
                  onClick={handleSendVerification}
                  disabled={isVerifying}
                  className="w-full py-2.5 rounded-xl border border-orange-500/30 text-orange-500 text-xs font-bold hover:bg-orange-500 hover:text-black transition-all flex items-center justify-center gap-2"
                >
                  {isVerifying ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Request Verification Email'}
                </button>
              )}
            </div>

            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-xl flex items-center gap-3 text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
                >
                  {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  {message.text}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-orange-500 text-black font-bold hover:bg-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Profile Changes
            </button>
          </form>

          {/* Danger Zone */}
          <div className="pt-8 border-t border-white/10">
            <h3 className="text-sm font-bold text-red-500 mb-4">Danger Zone</h3>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-3 rounded-xl border border-red-500/20 text-red-500 text-xs font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete My Account
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-4">
                <p className="text-xs text-red-500 font-medium">
                  Are you absolutely sure? This will permanently delete your account and all your data. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 rounded-xl bg-white/5 text-white text-xs font-bold hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                  >
                    {deleteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
