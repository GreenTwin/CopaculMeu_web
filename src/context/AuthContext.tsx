import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, LoginRequest, RegisterRequest } from '../types/auth';
import {
  getStoredUser,
  getStoredToken,
  loginUser,
  registerUser,
  fetchCurrentUser,
  logoutUser,
} from '../services/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<User>;
  logout: () => Promise<void>;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register' | 'confirm_email';
  authContextMessage: string | null;
  openAuthModal: (tab?: 'login' | 'register' | 'confirm_email', contextMessage?: string) => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register' | 'confirm_email'>('login');
  const [authContextMessage, setAuthContextMessage] = useState<string | null>(null);

  // Verify and hydrate current user on mount if token exists
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      fetchCurrentUser()
        .then((profile) => {
          setUser(profile);
        })
        .catch(() => {
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const auth = await loginUser(credentials);
      setUser(auth.user);
      setIsAuthModalOpen(false);
      setAuthContextMessage(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (data: RegisterRequest) => {
      setIsLoading(true);
      try {
        return await registerUser(data);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openAuthModal = useCallback(
    (tab: 'login' | 'register' | 'confirm_email' = 'login', contextMessage?: string) => {
      setAuthModalTab(tab);
      setAuthContextMessage(contextMessage || null);
      setIsAuthModalOpen(true);
    },
    []
  );

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setAuthContextMessage(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        isAuthModalOpen,
        authModalTab,
        authContextMessage,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
