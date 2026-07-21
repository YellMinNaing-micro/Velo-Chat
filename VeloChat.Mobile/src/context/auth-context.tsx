import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api, refreshSession, setSessionExpiredHandler } from '@/services/api';
import { sessionStorage } from '@/services/session-storage';
import type { TokenPair, UserProfile } from '@/types/api';

type RegisterInput = {
  username: string;
  fullName?: string;
  email: string;
  password: string;
  profilePictureUrl?: string;
};

type AuthValue = {
  user: UserProfile | null;
  isBooting: boolean;
  login(email: string, password: string): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
  refreshProfile(): Promise<UserProfile>;
  updateProfile(profile: UserProfile): void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  const clearSession = useCallback(async () => {
    await sessionStorage.clear();
    setUser(null);
  }, []);

  const loadProfile = useCallback(async () => {
    const response = await api.get<UserProfile>('/api/auth/me');
    setUser(response.data);
    return response.data;
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(clearSession);
    let mounted = true;

    (async () => {
      try {
        const savedTokens = await sessionStorage.read();
        if (!savedTokens) return;

        // Deliberately rotate the refresh token every time the splash screen boots.
        await refreshSession(savedTokens);
        if (mounted) await loadProfile();
      } catch {
        await sessionStorage.clear();
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsBooting(false);
      }
    })();

    return () => { mounted = false; };
  }, [clearSession, loadProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<TokenPair>('/api/auth/login', { email, password });
    await sessionStorage.save(response.data);
    await loadProfile();
  }, [loadProfile]);

  const register = useCallback(async (input: RegisterInput) => {
    await api.post('/api/auth/register', {
      ...input,
      fullName: input.fullName || null,
      profilePictureUrl: input.profilePictureUrl || null,
    });
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/api/auth/revoke'); } catch { /* local logout must still complete */ }
    await clearSession();
  }, [clearSession]);

  const value = useMemo<AuthValue>(() => ({
    user,
    isBooting,
    login,
    register,
    logout,
    refreshProfile: loadProfile,
    updateProfile: setUser,
  }), [isBooting, loadProfile, login, logout, register, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
