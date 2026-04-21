import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, FirebaseUser, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail, deleteUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, deleteDoc } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  subscriptionPlan: string;
  credits: number;
  role: 'user' | 'admin' | 'super_admin';
  phoneNumber?: string;
  createdAt: any;
}

interface FirebaseContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  deleteUserAccount: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('FirebaseProvider: Initializing auth listener...');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('FirebaseProvider: Auth state changed:', firebaseUser?.uid || 'No user');
      setUser(firebaseUser);
      
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        console.log('FirebaseProvider: Fetching profile for:', firebaseUser.uid);
        
        // Listen for real-time profile updates
        const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
          console.log('FirebaseProvider: Profile snapshot received. Exists:', docSnap.exists());
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            console.log('FirebaseProvider: Initializing new profile...');
            // Initialize profile if it doesn't exist
            const isSuperAdmin = firebaseUser.email === 'disat386@gmail.com';
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'New User',
              photoURL: firebaseUser.photoURL,
              phoneNumber: '',
              subscriptionPlan: 'free',
              credits: 10, // Initial free credits
              role: isSuperAdmin ? 'super_admin' : 'user',
              createdAt: serverTimestamp(),
            };
            
            setDoc(userDocRef, newProfile).then(() => {
              console.log('FirebaseProvider: Profile initialized successfully');
            }).catch(err => {
              console.error('FirebaseProvider: Profile initialization failed:', err);
              handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
            });
          }
          setLoading(false);
        }, (error) => {
          console.error('FirebaseProvider: Profile snapshot error:', error);
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          setLoading(false);
        });

        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const registerWithEmail = async (email: string, password: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name });
      // Update the firestore document with the name since onAuthStateChanged might have fired before updateProfile
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      setDoc(userDocRef, { displayName: name }, { merge: true }).catch(console.error);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const deleteUserAccount = async () => {
    if (!auth.currentUser) throw new Error('No user logged in');
    const uid = auth.currentUser.uid;
    
    // 1. Delete Firestore Data first
    const userDocRef = doc(db, 'users', uid);
    await deleteDoc(userDocRef);
    
    // 2. Delete Auth Account
    await deleteUser(auth.currentUser);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <FirebaseContext.Provider value={{ user, profile, loading, login, logout, loginWithEmail, registerWithEmail, resetPassword, deleteUserAccount }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
