"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  type User,
} from "firebase/auth";
import { auth } from "./firebase"; // your firebase.ts config

// -----------------
// Context type
// -----------------
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

// -----------------
// Create context
// -----------------
const AuthContext = createContext<AuthContextType | null>(null);

// -----------------
// Provider
// -----------------
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Watch for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Two allowed emails
  const CLINIC_EMAIL = "clinic@example.com";
  const CLINIC_EMAIL_2 = "clinic2@example.com";

  const signIn = async (password: string) => {
    try {
      // Try first account
      try {
        await signInWithEmailAndPassword(auth, CLINIC_EMAIL, password);
        return;
      } catch (_) {
        // Try second account
        await signInWithEmailAndPassword(auth, CLINIC_EMAIL_2, password);
      }
    } catch (error: any) {
      throw new Error(error.code || "auth/invalid-password");
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const changePassword = async (newPassword: string) => {
    if (!user) throw new Error("auth/not-authenticated");

    try {
      await updatePassword(user, newPassword);
    } catch (error: any) {
      throw new Error(error.code || "auth/unknown-error");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

// -----------------
// Hook to use Auth
// -----------------
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
