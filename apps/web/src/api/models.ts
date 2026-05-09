import client from './client';
import { Model } from '../types';
export const getModels = () => client.get<Model[]>('/models');
