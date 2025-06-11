import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: User | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Firebase is not configured, skip auth and just set loading to false
    if (!auth) {
      console.log('⚠️ Firebase not configured - skipping authentication');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Convert Firebase user to our User type
        const appUser: User = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL
        };
        setUser(appUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    if (!auth || !googleProvider) {
      toast.error('Authentication not configured. Please set up Firebase credentials.');
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      toast.success('Signed in successfully');
    } catch (error) {
      console.error('Error signing in:', error);
      toast.error('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!auth) {
      toast.error('Authentication not configured.');
      return;
    }

    setLoading(true);
    try {
      await firebaseSignOut(auth);
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
