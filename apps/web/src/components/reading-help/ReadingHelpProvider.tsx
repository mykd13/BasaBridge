'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  DEFAULT_STATE,
  applyToRoot,
  loadState,
  saveState,
  type ReadingHelpState,
} from '@/lib/reading-help/settings';

interface ReadingHelpContextValue {
  state: ReadingHelpState;
  /** False when this browser refused to keep the settings. */
  persisted: boolean;
  update: (next: ReadingHelpState) => void;
}

/** Window.localStorage itself can throw when site data is blocked. */
function trySave(learnerId: string, next: ReadingHelpState): boolean {
  try {
    return saveState(window.localStorage, learnerId, next);
  } catch {
    return false;
  }
}

const ReadingHelpContext = createContext<ReadingHelpContextValue | null>(null);

/**
 * Holds one learner's reading help for every student screen. It puts the settings on <html>
 * as data attributes, which packages/ui tokens turn into text size, spacing and contrast.
 * Until BB-10 lands the only copy is in this browser, under the learner's own key.
 */
export function ReadingHelpProvider({
  learnerId,
  children,
}: {
  learnerId: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<ReadingHelpState>(DEFAULT_STATE);
  const [persisted, setPersisted] = useState(true);
  // Until the stored copy is read, state is only the default. Applying it would overwrite
  // what ReadingHelpBoot already put on <html> and bring the reload flash back.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let saved: ReadingHelpState | null = null;
    try {
      saved = loadState(window.localStorage, learnerId);
    } catch {
      // Storage blocked: keep the defaults.
    }
    if (saved) setState(saved);
    setLoaded(true);
  }, [learnerId]);

  useEffect(() => {
    if (loaded) applyToRoot(document.documentElement, state);
  }, [state, loaded]);

  // Leaving the student area (sign out) must not leave this learner's text size on the page.
  // StrictMode and Fast Refresh unmount and remount at once, so the reset waits a tick and
  // skips if the provider came straight back. Otherwise it would flash the default size.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      setTimeout(() => {
        if (!mounted.current) applyToRoot(document.documentElement, DEFAULT_STATE);
      }, 0);
    };
  }, []);

  const update = useCallback(
    (next: ReadingHelpState) => {
      setState(next);
      setPersisted(trySave(learnerId, next));
    },
    [learnerId],
  );

  const value = useMemo(() => ({ state, persisted, update }), [state, persisted, update]);
  return <ReadingHelpContext.Provider value={value}>{children}</ReadingHelpContext.Provider>;
}

export function useReadingHelp(): ReadingHelpContextValue {
  const value = useContext(ReadingHelpContext);
  if (!value) throw new Error('useReadingHelp must be used inside ReadingHelpProvider');
  return value;
}
