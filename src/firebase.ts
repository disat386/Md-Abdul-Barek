import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, onSnapshot, collection, query, where, orderBy, limit, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId
};

// Fallback logic for empty environment variables
if (config.apiKey === "") config.apiKey = firebaseConfig.apiKey;
if (config.authDomain === "") config.authDomain = firebaseConfig.authDomain;
if (config.projectId === "") config.projectId = firebaseConfig.projectId;
if (config.storageBucket === "") config.storageBucket = firebaseConfig.storageBucket;
if (config.messagingSenderId === "") config.messagingSenderId = firebaseConfig.messagingSenderId;
if (config.appId === "") config.appId = firebaseConfig.appId;

// Ensure we have a valid key starting with AIzaSy (Web API Key format)
if (!config.apiKey || !config.apiKey.startsWith("AIzaSy")) {
  console.warn("Firebase: Provided API Key from environment was empty or invalid. Forcing fallback to Local Config.");
  config.apiKey = firebaseConfig.apiKey;
  config.authDomain = firebaseConfig.authDomain;
  config.projectId = firebaseConfig.projectId;
  config.storageBucket = firebaseConfig.storageBucket;
  config.messagingSenderId = firebaseConfig.messagingSenderId;
  config.appId = firebaseConfig.appId;
}

// Initialize Firebase
const apiKeySource = (config.apiKey === firebaseConfig.apiKey) ? "Local Config (Safe Fallback)" : "Environment Settings";
console.log(`Firebase: Initializing with Project ID: ${config.projectId} from ${apiKeySource}`);

const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app, config.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

if (!config.apiKey || !config.apiKey.startsWith("AIzaSy")) {
  console.error(`Firebase: Invalid API Key format (Prefix: ${config.apiKey?.substring(0, 5)}). Ensure you are using the Web API Key from Firebase Project Settings.`);
}

// Operation Types for Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection (Delayed to give network time to stabilize)
async function testConnection() {
  setTimeout(async () => {
    try {
      await getDoc(doc(db, 'test', 'connection'));
      console.log("Firebase Connection: Successful");
    } catch (error) {
      if (error instanceof Error && error.message.includes('offline')) {
         console.warn("Firebase: Client reported offline during initial pulse check.");
      } else {
         console.error("Firebase Connection Error:", error);
      }
    }
  }, 5000);
}
testConnection();

export type { FirebaseUser };
