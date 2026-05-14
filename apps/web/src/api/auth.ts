import client from './client';
import type { User } from '../types';

export const login = (email: string, password: string) =>
  client.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', { email, password });

export const logout = (refreshToken?: string | null) =>
  client.post('/auth/logout', { refreshToken });

export const getMe = () => client.get<User>('/auth/me');

export const changePassword = (oldPassword: string, newPassword: string) =>
  client.post('/auth/change-password', { oldPassword, newPassword });

export const refreshTokens = (refreshToken: string) =>
  client.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken });
