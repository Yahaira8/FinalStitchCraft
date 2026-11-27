import React, { createContext, useContext, useEffect, useState } from 'react';
import { RuntimeMode, User } from '../types';
import { storageAdapter } from '../lib/storageAdapter';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  runtimeMode: RuntimeMode;
  loginWithDemo: () => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>('aistudio-local');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const mode = await storageAdapter.init();
        if (!active) return;
        setRuntimeMode(mode);
        const currentUser = await storageAdapter.getCurrentUser();
        if (!active) return;
        setUser(currentUser);
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const loginWithDemo = async () => {
    const loggedIn = await storageAdapter.loginWithDemo();
    setUser(loggedIn);
    return loggedIn;
  };

  const loginWithGoogle = async () => {
    const loggedIn = await storageAdapter.loginWithGoogle();
    setUser(loggedIn);
    return loggedIn;
  };

  const login = async (email: string, password: string) => {
    const loggedIn = await storageAdapter.login(email, password);
    setUser(loggedIn);
    return loggedIn;
  };

  const register = async (email: string, username: string, password: string) => {
    const created = await storageAdapter.register(email, username, password);
    setUser(created);
    return created;
  };

  const logout = async () => {
    await storageAdapter.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        runtimeMode,
        loginWithDemo,
        loginWithGoogle,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
