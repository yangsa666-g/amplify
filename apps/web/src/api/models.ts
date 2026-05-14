import client from './client';
import type { Model } from '../types';
export const getModels = () => client.get<Model[]>('/models');
