import client from './client';
import { User } from '../types';

export const login = (email: string, password: string) =>
  client.post<{ accessToken: string; user: User }>('/auth/login', { email, password });

export const logout = () => client.post('/auth/logout');

export const getMe = () => client.get<User>('/auth/me');

export const changePassword = (oldPassword: string, newPassword: string) =>
  client.post('/auth/change-password', { oldPassword, newPassword });
