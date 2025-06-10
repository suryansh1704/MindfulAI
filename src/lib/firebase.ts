
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyABx1udym6Jv6x_jCVLw4zY6nCSBFREWbI",
  authDomain: "therapy-webapp-be11e.firebaseapp.com",
  projectId: "therapy-webapp-be11e",
  storageBucket: "therapy-webapp-be11e.firebasestorage.app",
  messagingSenderId: "712697750681",
  appId: "1:712697750681:web:77be4449a2e14d30988408"
};

// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Configure Google Sign-In
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { auth, db, googleProvider };
