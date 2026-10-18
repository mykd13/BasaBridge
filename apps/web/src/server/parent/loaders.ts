import { NotWiredError, isNotWired } from '@/server/errors';
import { authorizeParentAccount, authorizeParentRead } from './authz';
import type {
  DecisionsView,
  LevelsView,
  PrivacyView,
  ProgressView,
  ReadingsView,
  ScreenState,
  ShareSection,
} from './types';

/** What a loader returns. `empty` means shared but no activity yet. */
export type Loaded<T> = { kind: 'ok'; data: T } | { kind: 'empty' } | { kind: 'not-shared' };

/** Authorize first, then read. Every parent loader goes through here. */
async function loadShared<T>(
  learner: string,
  section: ShareSection,
  read: () => Promise<Loaded<T>>,
): Promise<Loaded<T>> {
  const grant = await authorizeParentRead(learner, section);
  if (!grant.shared) return { kind: 'not-shared' };
  return read();
}

export function loadProgress(learner: string): Promise<Loaded<ProgressView>> {
  return loadShared(learner, 'progress', async () => {
    throw new NotWiredError('BB-10 learner reads for parent progress');
  });
}

export function loadReadings(learner: string): Promise<Loaded<ReadingsView>> {
  return loadShared(learner, 'readings', async () => {
    throw new NotWiredError('BB-10 learner reads for parent readings');
  });
}

export function loadLevels(learner: string): Promise<Loaded<LevelsView>> {
  return loadShared(learner, 'levels', async () => {
    throw new NotWiredError('BB-10 learner reads for level history');
  });
}

export function loadDecisions(learner: string): Promise<Loaded<DecisionsView>> {
  return loadShared(learner, 'decisions', async () => {
    throw new NotWiredError('BB-10 learner reads for the decision log');
  });
}

export async function loadPrivacy(): Promise<Loaded<PrivacyView>> {
  await authorizeParentAccount();
  throw new NotWiredError('BB-10 reads for linked children');
}

/** Run a loader and turn the outcome into a screen state. A failure never reaches the page as an exception. */
export async function toScreenState<T>(load: () => Promise<Loaded<T>>): Promise<ScreenState<T>> {
  try {
    const result = await load();
    return result.kind === 'ok' ? { kind: 'ready', data: result.data } : { kind: result.kind };
  } catch (error) {
    if (isNotWired(error)) return { kind: 'not-wired' };
    // Log the error type only. Messages can carry learner data (AGENTS.md rule 2).
    console.error('parent screen failed', error instanceof Error ? error.name : 'unknown');
    return { kind: 'error' };
  }
}
