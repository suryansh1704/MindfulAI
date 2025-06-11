import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration from environment variables with fallbacks
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:demo-app-id"
};

console.log('🔥 Firebase Config:', {
  hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  hasAuthDomain: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  hasProjectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
  usingFallback: !import.meta.env.VITE_FIREBASE_API_KEY
});

// Initialize Firebase only if it hasn't been initialized yet
let app, auth, db, googleProvider;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();

  // Configure Google Sign-In
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
  
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  // Create dummy objects to prevent app crashes
  auth = null;
  db = null;
  googleProvider = null;
}

export { auth, db, googleProvider };
