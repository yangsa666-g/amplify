import client from './client';
import { Document } from '../types';

export const uploadDocument = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return client.post<Document>('/documents/upload', form);
};

export const getDocumentText = (id: string) =>
  client.get<{ text: string }>(`/documents/${id}/text`);

export const downloadDocument = async (id: string, fileName: string) => {
  const response = await client.get(`/documents/${id}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadTextAsMarkdown = (text: string, fileName: string) => {
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.replace(/\.[^.]+$/, '') + '_ocr.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
