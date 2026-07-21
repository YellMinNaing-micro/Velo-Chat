import axios, { AxiosError, create, InternalAxiosRequestConfig, isAxiosError } from 'axios';
import { Platform } from 'react-native';

import { sessionStorage } from './session-storage';
import type { TokenPair } from '@/types/api';

const emulatorDefault = Platform.OS === 'android'
  ? 'http://10.0.2.2:5027'
  : 'http://localhost:5027';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || emulatorDefault).replace(/\/$/, '');

export const api = create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

let refreshPromise: Promise<TokenPair> | null = null;
let onSessionExpired: (() => void | Promise<void>) | null = null;

export function setSessionExpiredHandler(handler: () => void | Promise<void>) {
  onSessionExpired = handler;
}

export async function refreshSession(tokens?: TokenPair): Promise<TokenPair> {
  const current = tokens ?? await sessionStorage.read();
  if (!current) throw new Error('No saved session');

  const response = await axios.post<TokenPair>(`${API_BASE_URL}/api/auth/refresh`, current, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });
  await sessionStorage.save(response.data);
  return response.data;
}

api.interceptors.request.use(async (config) => {
  const tokens = await sessionStorage.read();
  if (tokens) config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isRefreshRequest = request?.url?.includes('/api/auth/refresh');

    if (error.response?.status !== 401 || !request || request._retry || isRefreshRequest) {
      return Promise.reject(error);
    }

    request._retry = true;
    try {
      refreshPromise ??= refreshSession().finally(() => { refreshPromise = null; });
      const tokens = await refreshPromise;
      request.headers.Authorization = `Bearer ${tokens.accessToken}`;
      return api(request);
    } catch (refreshError) {
      await sessionStorage.clear();
      await onSessionExpired?.();
      return Promise.reject(refreshError);
    }
  },
);

export function getApiError(error: unknown, fallback = 'Something went wrong.') {
  if (!isAxiosError(error)) return error instanceof Error ? error.message : fallback;
  const data = error.response?.data as string | { title?: string; errors?: Record<string, string[]> } | undefined;
  if (typeof data === 'string') return data;
  if (data?.errors) return Object.values(data.errors).flat().join(' ');
  return data?.title || (error.code === 'ECONNABORTED' ? 'The server took too long to respond.' : fallback);
}
