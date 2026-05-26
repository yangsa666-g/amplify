import { useEffect, useState } from 'react';
import { useUiStore } from '../stores/uiStore';

const QUERY = '(prefers-color-scheme: dark)';

/** Tracks the OS-level dark-mode preference, reacting to live changes. */
export function useSystemPrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersDark;
}

/** Resolves the effective dark/light state from the user's theme choice. */
export function useIsDark(): boolean {
  const mode = useUiStore((s) => s.themeMode);
  const systemDark = useSystemPrefersDark();
  return mode === 'dark' || (mode === 'system' && systemDark);
}
