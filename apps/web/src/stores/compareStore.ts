import { create } from 'zustand';
import type { CompareResult, Document, ReasoningEffort } from '../types';

interface CompareState {
  documents: Array<Document | null>;
  selectedModel: string;
  selectedReasoningEffort: ReasoningEffort;
  result: CompareResult | null;
  setDocument: (index: number, document: Document | null) => void;
  addDocumentSlot: () => void;
  removeDocumentSlot: (index: number) => void;
  setSelectedModel: (model: string) => void;
  setSelectedReasoningEffort: (effort: ReasoningEffort) => void;
  setResult: (result: CompareResult | null) => void;
}

export const useCompareStore = create<CompareState>()((set) => ({
  documents: [null, null],
  selectedModel: '',
  selectedReasoningEffort: 'medium',
  result: null,
  setDocument: (index, document) =>
    set((state) => ({
      documents: state.documents.map((item, itemIndex) => (itemIndex === index ? document : item)),
      result: null,
    })),
  addDocumentSlot: () =>
    set((state) => ({
      documents: state.documents.length < 5 ? [...state.documents, null] : state.documents,
      result: null,
    })),
  removeDocumentSlot: (index) =>
    set((state) => ({
      documents:
        state.documents.length > 2
          ? state.documents.filter((_, itemIndex) => itemIndex !== index)
          : state.documents,
      result: null,
    })),
  setSelectedModel: (selectedModel) => set({ selectedModel, result: null }),
  setSelectedReasoningEffort: (selectedReasoningEffort) =>
    set({ selectedReasoningEffort, result: null }),
  setResult: (result) => set({ result }),
}));
