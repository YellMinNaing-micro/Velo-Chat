import axios, { create, isAxiosError } from 'axios';

import { getApiError, refreshSession } from './api';
import { sessionStorage } from './session-storage';

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('./session-storage', () => ({
  sessionStorage: { read: jest.fn(), save: jest.fn(), clear: jest.fn() },
}));
jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn() },
  create: jest.fn(() => {
    const instance: any = jest.fn();
    instance.interceptors = { request: { use: jest.fn() }, response: { use: jest.fn() } };
    return instance;
  }),
  isAxiosError: jest.fn(),
}));

const storage = sessionStorage as jest.Mocked<typeof sessionStorage>;
const post = axios.post as jest.Mock;
const checkAxiosError = isAxiosError as unknown as jest.Mock;

beforeEach(() => {
  post.mockReset();
  checkAxiosError.mockReset();
  (storage.read as jest.Mock).mockReset();
  (storage.save as jest.Mock).mockReset();
  (storage.clear as jest.Mock).mockReset();
  (create as jest.Mock).mock.results[0].value.mockReset();
});

function interceptors() {
  const instance = (create as jest.Mock).mock.results[0].value;
  return {
    instance,
    request: instance.interceptors.request.use.mock.calls[0][0],
    responseError: instance.interceptors.response.use.mock.calls[0][1],
  };
}

test('refreshSession rejects when there is no saved session', async () => {
  storage.read.mockResolvedValueOnce(null);
  await expect(refreshSession()).rejects.toThrow('No saved session');
  expect(post).not.toHaveBeenCalled();
});

test('refreshSession posts old tokens and persists rotated tokens', async () => {
  const oldTokens = { accessToken: 'old-access', refreshToken: 'old-refresh' };
  const newTokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };
  post.mockResolvedValueOnce({ data: newTokens });
  storage.save.mockResolvedValueOnce();

  await expect(refreshSession(oldTokens)).resolves.toEqual(newTokens);
  expect(post).toHaveBeenCalledWith(
    expect.stringContaining('/api/auth/refresh'), oldTokens,
    expect.objectContaining({ timeout: 15000 }),
  );
  expect(storage.save).toHaveBeenCalledWith(newTokens);
});

test('getApiError shows server validation errors and timeout text', () => {
  checkAxiosError.mockReturnValue(true);
  expect(getApiError({ response: { data: { errors: { Email: ['Invalid email'], Password: ['Too short'] } } } }))
    .toBe('Invalid email Too short');
  expect(getApiError({ code: 'ECONNABORTED' })).toBe('The server took too long to respond.');
});

test('request interceptor attaches the saved access token', async () => {
  storage.read.mockResolvedValueOnce({ accessToken: 'access', refreshToken: 'refresh' });
  const config = { headers: {} };

  await expect(interceptors().request(config)).resolves.toEqual({
    headers: { Authorization: 'Bearer access' },
  });
});

test('401 response refreshes once and retries with the new access token', async () => {
  const { instance, responseError } = interceptors();
  const newTokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };
  storage.read.mockResolvedValueOnce({ accessToken: 'old-access', refreshToken: 'old-refresh' });
  storage.save.mockResolvedValueOnce();
  post.mockResolvedValueOnce({ data: newTokens });
  instance.mockResolvedValueOnce({ data: 'retried' });
  const request = { url: '/api/auth/me', headers: {} };

  await expect(responseError({ response: { status: 401 }, config: request }))
    .resolves.toEqual({ data: 'retried' });
  expect(request).toMatchObject({ _retry: true, headers: { Authorization: 'Bearer new-access' } });
  expect(instance).toHaveBeenCalledWith(request);
});

test('failed refresh clears the saved session', async () => {
  const { responseError } = interceptors();
  storage.read.mockResolvedValueOnce({ accessToken: 'old-access', refreshToken: 'old-refresh' });
  storage.clear.mockResolvedValueOnce();
  post.mockRejectedValueOnce(new Error('expired'));

  await expect(responseError({ response: { status: 401 }, config: { url: '/api/auth/me', headers: {} } }))
    .rejects.toThrow('expired');
  expect(storage.clear).toHaveBeenCalledTimes(1);
});
