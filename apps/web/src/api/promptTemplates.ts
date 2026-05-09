import client from './client';
import { PromptTemplate } from '../types';

export const getCurrentPromptTemplate = () =>
  client.get<PromptTemplate>('/prompt-templates/current?type=risk_analysis');

export const savePromptTemplate = (name: string, content: string) =>
  client.put<PromptTemplate>('/prompt-templates/current?type=risk_analysis', { name, content });

export const resetPromptTemplate = () =>
  client.post<PromptTemplate>('/prompt-templates/current/reset?type=risk_analysis');

// Admin — system default
export const getAdminDefaultPromptTemplate = () =>
  client.get<PromptTemplate>('/admin/prompt-templates/default?type=risk_analysis');

export const updateAdminDefaultPromptTemplate = (name: string, content: string) =>
  client.put<PromptTemplate>('/admin/prompt-templates/default?type=risk_analysis', { name, content });
