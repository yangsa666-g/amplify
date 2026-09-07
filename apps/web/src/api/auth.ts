import client from './client';
import type { AuthenticationConfiguration, User } from '../types';

export const login = (email: string, password: string) =>
  client.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
    email,
    password,
  });

export const logout = (refreshToken?: string | null) =>
  client.post('/auth/logout', { refreshToken });

export const getMe = () => client.get<User>('/auth/me');

export const changePassword = (oldPassword: string, newPassword: string) =>
  client.post('/auth/change-password', { oldPassword, newPassword });

export const refreshTokens = (refreshToken: string) =>
  client.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken });

// ─── Microsoft Entra ID SSO ──────────────────────────────────────────────────

export const getEntraEnabled = () => client.get<{ enabled: boolean }>('/auth/entra/enabled');

export const getAuthenticationConfiguration = () =>
  client.get<AuthenticationConfiguration>('/auth/configuration');

// Trades the one-time code from the SSO callback redirect for app session tokens.
export const exchangeEntraCode = (code: string) =>
  client.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/entra/exchange', {
    code,
  });
