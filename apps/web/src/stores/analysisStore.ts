import { create } from 'zustand';
import type { Document, AnalysisResult, ReasoningEffort } from '../types';

interface AnalysisState {
  uploadedDoc: Document | null;
  selectedModel: string;
  selectedReasoningEffort: ReasoningEffort;
  result: AnalysisResult | null;
  ocrPreviewOpen: boolean;
  setUploadedDoc: (doc: Document | null) => void;
  setSelectedModel: (model: string) => void;
  setSelectedReasoningEffort: (reasoningEffort: ReasoningEffort) => void;
  setResult: (result: AnalysisResult | null) => void;
  setOcrPreviewOpen: (open: boolean) => void;
}

export const useAnalysisStore = create<AnalysisState>()((set) => ({
  uploadedDoc: null,
  selectedModel: '',
  selectedReasoningEffort: 'medium',
  result: null,
  ocrPreviewOpen: false,
  setUploadedDoc: (doc) => set({ uploadedDoc: doc }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setSelectedReasoningEffort: (reasoningEffort) => set({ selectedReasoningEffort: reasoningEffort }),
  setResult: (result) => set({ result }),
  setOcrPreviewOpen: (open) => set({ ocrPreviewOpen: open }),
}));
