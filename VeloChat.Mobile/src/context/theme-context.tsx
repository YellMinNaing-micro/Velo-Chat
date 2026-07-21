import * as SecureStore from 'expo-secure-store';
import * as SystemUI from 'expo-system-ui';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform } from 'react-native';

import { darkColors, lightColors, ThemeColors } from '@/constants/colors';

export type ThemeMode = 'light' | 'dark';
type ThemeValue = { colors: ThemeColors; isThemeReady: boolean; mode: ThemeMode; setMode(mode: ThemeMode): void; toggleTheme(): void };
const THEME_KEY = 'velo.theme';
const ThemeContext = createContext<ThemeValue | null>(null);

async function readTheme(): Promise<ThemeMode | null> {
  const value = Platform.OS === 'web'
    ? (typeof localStorage === 'undefined' ? null : localStorage.getItem(THEME_KEY))
    : await SecureStore.getItemAsync(THEME_KEY);
  return value === 'dark' || value === 'light' ? value : null;
}

async function saveTheme(value: ThemeMode) {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(THEME_KEY, value);
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [isThemeReady, setThemeReady] = useState(false);

  useEffect(() => {
    readTheme().then((saved) => { if (saved) setModeState(saved); }).finally(() => setThemeReady(true));
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    Appearance.setColorScheme(next);
    void saveTheme(next);
    void SystemUI.setBackgroundColorAsync(next === 'dark' ? darkColors.background : lightColors.background);
  };

  const value = useMemo<ThemeValue>(() => ({
    colors: mode === 'dark' ? darkColors : lightColors,
    isThemeReady,
    mode,
    setMode,
    toggleTheme: () => setMode(mode === 'dark' ? 'light' : 'dark'),
  }), [isThemeReady, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useAppTheme must be used inside AppThemeProvider');
  return value;
}
