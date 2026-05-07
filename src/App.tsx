import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// Pages
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import Login from './pages/Login';
import CineAura from './pages/CineAura';
import ReelAura from './pages/ReelAura';
import ThumbAura from './pages/ThumbAura';
import ScriptAura from './pages/ScriptAura';
import AdminPanel from './pages/AdminPanel';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const userRef = doc(db, 'users', authUser.uid);
        const userDoc = await getDoc(userRef);
        
        // Define default role based on email
        const defaultRole = authUser.email === 'disat386@gmail.com' ? 'super-admin' : 'user';
        
        if (!userDoc.exists()) {
          const newProfile = {
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
            role: defaultRole,
            credits: 500, // Giving 500 free credits to new users
            createdAt: serverTimestamp(),
            lastActive: serverTimestamp(),
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile);
        } else {
          const existingProfile = userDoc.data();
          // Ensure disat386 always keeps super-admin status even if locally modified
          if (authUser.email === 'disat386@gmail.com' && existingProfile.role !== 'super-admin') {
            const updatedProfile = { ...existingProfile, role: 'super-admin' };
            await setDoc(userRef, { role: 'super-admin' }, { merge: true });
            setProfile(updatedProfile);
          } else {
            setProfile(existingProfile);
          }
        }
        setUser(authUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />

        {/* Protected App Routes */}
        {user ? (
          <Route path="/*" element={
            <div className="min-h-screen bg-zinc-950 flex">
              <Sidebar role={profile?.role} />
              <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                <Navbar user={user} profile={profile} />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard profile={profile} />} />
                    <Route path="/cine" element={<CineAura profile={profile} />} />
                    <Route path="/reel" element={<ReelAura profile={profile} />} />
                    <Route path="/thumb" element={<ThumbAura profile={profile} />} />
                    <Route path="/script" element={<ScriptAura profile={profile} />} />
                    <Route path="/admin" element={['super-admin', 'sub-admin'].includes(profile?.role) ? <AdminPanel profile={profile} /> : <Navigate to="/dashboard" />} />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </main>
              </div>
              <MobileNav />
            </div>
          } />
        ) : (
          <Route path="*" element={<Navigate to="/" />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}
