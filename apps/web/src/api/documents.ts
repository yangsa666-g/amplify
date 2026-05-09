import client from './client';
import { Document } from '../types';

export const uploadDocument = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return client.post<Document>('/documents/upload', form);
};
