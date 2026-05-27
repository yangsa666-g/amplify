import { create } from 'zustand';
import type { Document, CompareResult } from '../types';

// In-memory (like analysisStore): the compare page's inputs and result survive
// navigating away and back within the session. A full page refresh resets it.
interface CompareState {
  oldDoc: Document | null;
  newDoc: Document | null;
  diffMode: 'side_by_side' | 'unified';
  result: CompareResult | null;
  setOldDoc: (doc: Document | null) => void;
  setNewDoc: (doc: Document | null) => void;
  setDiffMode: (mode: 'side_by_side' | 'unified') => void;
  setResult: (result: CompareResult | null) => void;
}

export const useCompareStore = create<CompareState>()((set) => ({
  oldDoc: null,
  newDoc: null,
  diffMode: 'side_by_side',
  result: null,
  setOldDoc: (doc) => set({ oldDoc: doc }),
  setNewDoc: (doc) => set({ newDoc: doc }),
  setDiffMode: (mode) => set({ diffMode: mode }),
  setResult: (result) => set({ result }),
}));
