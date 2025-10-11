
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { migrateLocalDataToFirestore } from '@/lib/firestore';
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email:string, password:string) => Promise<any>;
  signupWithEmail: (email:string, password:string) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // This ensures that the user's session is persisted across browser sessions.
    setPersistence(auth, browserLocalPersistence).then(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUser(user);
                // Check if this is the first login after having local data
                const hasMigrated = localStorage.getItem(`migrated_${user.uid}`);
                if (!hasMigrated) {
                    await migrateLocalDataToFirestore(user.uid);
                    localStorage.setItem(`migrated_${user.uid}`, 'true');
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }).catch((error) => {
        console.error("Error setting persistence:", error);
        setLoading(false);
    });
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: 'select_account',
        'login_hint': 'user@example.com',
        'display': 'popup',
        'auth_type': 'reauthenticate',
        'app_name': 'Granor'
    });
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      toast({
        title: "Erro de Login com Google",
        description: "Não foi possível fazer o login com o Google.",
        variant: "destructive",
    });
    }
  };

  const loginWithEmail = async (email:string, password:string) => {
      return signInWithEmailAndPassword(auth, email, password);
  }

  const signupWithEmail = async (email:string, password:string) => {
      return createUserWithEmailAndPassword(auth, email, password);
  }


  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const value = {
    user,
    loading,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    logout,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

    