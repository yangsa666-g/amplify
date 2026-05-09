import { create } from 'zustand';
import type { Document, AnalysisResult } from '../types';

interface AnalysisState {
  uploadedDoc: Document | null;
  selectedModel: string;
  result: AnalysisResult | null;
  ocrPreviewOpen: boolean;
  setUploadedDoc: (doc: Document | null) => void;
  setSelectedModel: (model: string) => void;
  setResult: (result: AnalysisResult | null) => void;
  setOcrPreviewOpen: (open: boolean) => void;
}

export const useAnalysisStore = create<AnalysisState>()((set) => ({
  uploadedDoc: null,
  selectedModel: '',
  result: null,
  ocrPreviewOpen: false,
  setUploadedDoc: (doc) => set({ uploadedDoc: doc }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setResult: (result) => set({ result }),
  setOcrPreviewOpen: (open) => set({ ocrPreviewOpen: open }),
}));
