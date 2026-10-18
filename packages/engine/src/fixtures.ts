/** Test helpers: a small world of in-memory repositories and generated stories. Not exported. */
import type { TryAnalysis } from '@basabridge/contracts';
import {
  MemoryAnalyses,
  MemoryLearners,
  MemoryPlacements,
  MemorySessions,
  MemoryStoryBank,
} from './memory';
import { emptyProgress } from './session';
import type { EngineDeps, LearnerProfile, StoredQuestion, StoredStory } from './types';

let counter = 0;
export const uuid = (): string => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`;

export function makeStory(level: number): StoredStory {
  const q = (over: Partial<StoredQuestion>): StoredQuestion => ({
    id: uuid(),
    type: 'multiple_choice',
    skill: 'literal',
    subskill: 'key_detail',
    question: 'What happened in the story today?',
    options: ['one', 'two', 'three', 'four'],
    key: { kind: 'single', index: 0 },
    evidence: 'The evidence sentence.',
    ...over,
  });
  return {
    id: uuid(),
    level,
    title: `Story at ${level}`,
    text: 'A short story about a boy and his dog.',
    words: 9,
    questions: [
      q({ skill: 'vocabulary', subskill: 'word_in_context' }),
      q({}),
      q({ skill: 'inferential', subskill: 'cause_effect', key: { kind: 'single', index: 2 } }),
      q({
        type: 'choose_all',
        subskill: 'main_idea',
        options: ['a', 'b', 'c', 'd'],
        key: { kind: 'multi', indexes: [0, 1] },
      }),
      q({
        type: 'order_events',
        subskill: 'sequence',
        options: ['last', 'first', 'second'],
        key: { kind: 'order', order: [1, 2, 0] },
      }),
    ],
  };
}

/** What a learner who knows the answer would send. */
export function rightChoice(q: StoredQuestion): number[] {
  switch (q.key.kind) {
    case 'single':
      return [q.key.index];
    case 'multi':
      return q.key.indexes;
    case 'order':
      return q.key.order;
  }
}

/** A valid pick that is wrong. */
export function wrongChoice(q: StoredQuestion): number[] {
  switch (q.key.kind) {
    case 'single':
      return [(q.key.index + 1) % q.options.length];
    case 'multi':
      return [3];
    case 'order':
      return [...q.key.order].reverse();
  }
}

export function analysis(wordsRight: number, over: Partial<TryAnalysis> = {}): TryAnalysis {
  return {
    completed: true,
    lastWordIndex: 19,
    wordsTotal: 20,
    wordsRight,
    seconds: 20,
    wordsPerMinute: 60,
    words: [
      { expected: 'a', heard: 'a', outcome: 'correct', confidence: 0.9, markedMisheard: false },
    ],
    ...over,
  };
}

export interface World {
  deps: EngineDeps;
  learners: MemoryLearners;
  sessions: MemorySessions;
  placements: MemoryPlacements;
  bank: MemoryStoryBank;
  placementBank: MemoryStoryBank;
  analyses: MemoryAnalyses;
  clock: { now: Date };
}

export function makeWorld(
  opts: {
    learner?: Partial<LearnerProfile>;
    levels?: number[];
    perLevel?: number;
  } = {},
): World {
  const levels = opts.levels ?? [15];
  const perLevel = opts.perLevel ?? 14;
  const stories = levels.flatMap((l) => Array.from({ length: perLevel }, () => makeStory(l)));
  const placementStories = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70].flatMap((l) =>
    Array.from({ length: 3 }, () => makeStory(l)),
  );
  const learners = new MemoryLearners();
  const profile: LearnerProfile = {
    id: uuid(),
    grade: 3,
    micAllowed: true,
    listenThenReadEnabled: true,
    progress: { ...emptyProgress(), level: levels[0] ?? 15 },
    placement: { state: 'completed', finishedAt: new Date('2026-01-01T00:00:00Z'), result: null },
    ...opts.learner,
  };
  learners.profiles.set(profile.id, profile);
  const sessions = new MemorySessions();
  const placements = new MemoryPlacements();
  const bank = new MemoryStoryBank(stories);
  const placementBank = new MemoryStoryBank(placementStories);
  const analyses = new MemoryAnalyses();
  const clock = { now: new Date('2026-02-01T00:00:00Z') };
  const deps: EngineDeps = {
    learners,
    sessions,
    placements,
    stories: bank,
    placementStories: placementBank,
    analyses,
    now: () => new Date(clock.now),
    newId: uuid,
  };
  return { deps, learners, sessions, placements, bank, placementBank, analyses, clock };
}
