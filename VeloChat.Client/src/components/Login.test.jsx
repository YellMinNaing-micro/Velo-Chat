import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Login from './Login';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('lucide-react', () => ({
  LogIn: () => null, Mail: () => null, Lock: () => null, AlertCircle: () => null,
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('submits the entered username and password', async () => {
  const login = vi.fn().mockResolvedValue({ username: 'alice' });
  useAuth.mockReturnValue({ login });
  render(<Login onNavigateToRegister={() => {}} />);

  fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'alice' } });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => expect(login).toHaveBeenCalledWith('alice', 'secret'));
});

it('shows a login error and allows navigating to registration', async () => {
  const login = vi.fn().mockRejectedValue('Invalid credentials.');
  const navigate = vi.fn();
  useAuth.mockReturnValue({ login });
  render(<Login onNavigateToRegister={navigate} />);

  fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'alice' } });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

  expect(await screen.findByText('Invalid credentials.')).toBeTruthy();
  fireEvent.click(screen.getByText('Create account'));
  expect(navigate).toHaveBeenCalledOnce();
});
