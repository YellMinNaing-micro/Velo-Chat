import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { TokenPair } from '@/types/api';

const ACCESS_TOKEN_KEY = 'velo.accessToken';
const REFRESH_TOKEN_KEY = 'velo.refreshToken';

const readItem = (key: string) => Platform.OS === 'web'
  ? Promise.resolve(typeof localStorage === 'undefined' ? null : localStorage.getItem(key))
  : SecureStore.getItemAsync(key);

const saveItem = (key: string, value: string) => {
  if (Platform.OS !== 'web') return SecureStore.setItemAsync(key, value);
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  return Promise.resolve();
};

const deleteItem = (key: string) => {
  if (Platform.OS !== 'web') return SecureStore.deleteItemAsync(key);
  if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  return Promise.resolve();
};

export const sessionStorage = {
  async read(): Promise<TokenPair | null> {
    const [accessToken, refreshToken] = await Promise.all([
      readItem(ACCESS_TOKEN_KEY),
      readItem(REFRESH_TOKEN_KEY),
    ]);
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  },

  async save(tokens: TokenPair) {
    await Promise.all([
      saveItem(ACCESS_TOKEN_KEY, tokens.accessToken),
      saveItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
    ]);
  },

  async clear() {
    await Promise.all([
      deleteItem(ACCESS_TOKEN_KEY),
      deleteItem(REFRESH_TOKEN_KEY),
    ]);
  },
};
