import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { post: vi.fn(), get: vi.fn() } }));

let auth;
function Probe() {
  auth = useAuth();
  return <div>{auth.loading ? 'Loading' : auth.user?.username ?? 'Signed out'}</div>;
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  auth = null;
});

afterEach(() => { cleanup(); localStorage.clear(); });

it('restores a saved user when an access token exists', async () => {
  localStorage.setItem('accessToken', 'saved-token');
  localStorage.setItem('user', JSON.stringify({ id: '1', username: 'alice' }));
  render(<AuthProvider><Probe /></AuthProvider>);
  expect(await screen.findByText('alice')).toBeTruthy();
});

it('logs in and saves the token pair and user', async () => {
  const claims = {
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': '1',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'alice',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'alice@example.com',
  };
  const token = `header.${btoa(JSON.stringify(claims))}.signature`;
  api.post.mockResolvedValueOnce({ data: { accessToken: token, refreshToken: 'refresh' } });
  render(<AuthProvider><Probe /></AuthProvider>);

  await act(async () => { await auth.login('alice', 'password'); });

  expect(api.post).toHaveBeenCalledWith('/api/auth/login', { email: 'alice', password: 'password' });
  expect(screen.getByText('alice')).toBeTruthy();
  expect(localStorage.getItem('accessToken')).toBe(token);
  expect(localStorage.getItem('refreshToken')).toBe('refresh');
});

it('clears local session even when revoke fails', async () => {
  localStorage.setItem('accessToken', 'token');
  localStorage.setItem('refreshToken', 'refresh');
  localStorage.setItem('user', JSON.stringify({ username: 'alice' }));
  api.post.mockRejectedValueOnce(new Error('offline'));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  render(<AuthProvider><Probe /></AuthProvider>);

  await act(async () => { await auth.logout(); });

  expect(screen.getByText('Signed out')).toBeTruthy();
  expect(localStorage.getItem('accessToken')).toBeNull();
  expect(localStorage.getItem('refreshToken')).toBeNull();
  expect(localStorage.getItem('user')).toBeNull();
});

it('clears user when the API reports an expired session', async () => {
  localStorage.setItem('accessToken', 'token');
  localStorage.setItem('user', JSON.stringify({ username: 'alice' }));
  render(<AuthProvider><Probe /></AuthProvider>);
  await screen.findByText('alice');

  act(() => window.dispatchEvent(new Event('auth-logout')));
  await waitFor(() => expect(screen.getByText('Signed out')).toBeTruthy());
});
