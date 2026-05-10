import client from './client';
import type { Notification } from '../types';

export const getNotifications = async (): Promise<Notification[]> => {
  const { data } = await client.get('/notifications');
  return data;
};

export const getUnreadCount = async (): Promise<{ count: number }> => {
  const { data } = await client.get('/notifications/unread-count');
  return data;
};

export const markRead = async (id: string): Promise<void> => {
  await client.put(`/notifications/${id}/read`);
};

export const markAllRead = async (): Promise<void> => {
  await client.put('/notifications/read-all');
};
