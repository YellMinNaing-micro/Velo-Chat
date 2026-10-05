import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { sessionStorage } from './session-storage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

const secure = SecureStore as jest.Mocked<typeof SecureStore>;

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'android';
});

test('returns null when either token is missing', async () => {
  secure.getItemAsync.mockResolvedValueOnce('access').mockResolvedValueOnce(null);
  await expect(sessionStorage.read()).resolves.toBeNull();
});

test('reads a complete token pair from secure storage', async () => {
  secure.getItemAsync.mockResolvedValueOnce('access').mockResolvedValueOnce('refresh');
  await expect(sessionStorage.read()).resolves.toEqual({ accessToken: 'access', refreshToken: 'refresh' });
});

test('saves and clears both native tokens', async () => {
  secure.setItemAsync.mockResolvedValue();
  secure.deleteItemAsync.mockResolvedValue();

  await sessionStorage.save({ accessToken: 'access', refreshToken: 'refresh' });
  expect(secure.setItemAsync).toHaveBeenCalledWith('velo.accessToken', 'access');
  expect(secure.setItemAsync).toHaveBeenCalledWith('velo.refreshToken', 'refresh');

  await sessionStorage.clear();
  expect(secure.deleteItemAsync).toHaveBeenCalledWith('velo.accessToken');
  expect(secure.deleteItemAsync).toHaveBeenCalledWith('velo.refreshToken');
});
