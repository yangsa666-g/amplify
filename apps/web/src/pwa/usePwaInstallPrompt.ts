import { useCallback, useEffect, useState } from 'react';

type InstallPromptOutcome = 'accepted' | 'dismissed';

type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: InstallPromptOutcome; platform: string }>;
  prompt: () => Promise<void>;
};

type InstallSnapshot = {
  promptEvent: BeforeInstallPromptEvent | null;
  installed: boolean;
};

const listeners = new Set<() => void>();
let promptEvent: BeforeInstallPromptEvent | null = null;
let installed = isStandalone();

function isStandalone() {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function getSnapshot(): InstallSnapshot {
  return { promptEvent, installed };
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    promptEvent = event as BeforeInstallPromptEvent;
    installed = false;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    promptEvent = null;
    installed = true;
    notifyListeners();
  });
}

export function usePwaInstallPrompt() {
  const [snapshot, setSnapshot] = useState(getSnapshot);

  useEffect(() => {
    return subscribe(() => setSnapshot(getSnapshot()));
  }, []);

  const promptInstall = useCallback(async () => {
    if (!promptEvent) return 'dismissed' satisfies InstallPromptOutcome;

    const event = promptEvent;
    await event.prompt();
    const choice = await event.userChoice;
    promptEvent = null;
    notifyListeners();
    return choice.outcome;
  }, []);

  return {
    canInstall: Boolean(snapshot.promptEvent) && !snapshot.installed,
    installed: snapshot.installed,
    promptInstall,
  };
}
