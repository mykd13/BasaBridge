import { createRegistry, memoryLessonProgressStore, type Gap } from '@basabridge/learn';
import {
  createLearnPort,
  memoryReachStore,
  memoryOfferCounter,
  memoryPositionStore,
  type PracticeItemKey,
  type QuizFacts,
} from './service';
import type { LearnPort } from './port';

/** Lessons for tests only. App code never imports this file. */
export const LESSON_FILES = [
  {
    id: 'why-did-it-happen',
    subject: 'cause_effect',
    band: 'middle',
    title: 'Why did it happen?',
    goal: 'find out why something happened in a story.',
    status: 'reviewed',
    reviewedBy: 'Test reviewer',
    steps: [
      { kind: 'explain', text: 'Look for because, so and that is why.' },
      {
        kind: 'example',
        passage: 'It rained, so Mia stayed home.',
        point: 'So points to the reason.',
      },
      { kind: 'practice', items: 2 },
      { kind: 'check', items: 2 },
    ],
  },
  {
    id: 'say-it-slowly',
    subject: 'decoding',
    band: 'early',
    title: 'Say it slowly',
    goal: 'read long words in parts.',
    status: 'reviewed',
    reviewedBy: 'Test reviewer',
    steps: [
      { kind: 'explain', text: 'Break a word into parts.' },
      { kind: 'example', passage: 'sun-set', point: 'Two parts.' },
      { kind: 'practice', items: 1 },
      { kind: 'check', items: 1 },
    ],
  },
];

export const ITEMS: PracticeItemKey[] = [
  {
    id: 'item-1',
    prompt: 'Why was Ben late?',
    options: ['His alarm did not ring', 'He ran', 'The bus had gone'],
    hint: 'Look for the word because.',
    answerIndex: 0,
  },
];

export function testPort(
  over: { quiz?: QuizFacts; gaps?: Gap[]; level?: number; now?: () => Date } = {},
) {
  const progress = memoryLessonProgressStore();
  const positions = memoryPositionStore();
  const reach = memoryReachStore();
  const offers = memoryOfferCounter();
  const quiz: QuizFacts = over.quiz ?? {
    wrongAnswers: 2,
    passed: false,
    duringPlacement: false,
    gaps: [{ subject: 'cause_effect', misses: 2, reasons: [] }],
    level: 24,
  };
  const port = createLearnPort({
    registry: createRegistry(LESSON_FILES),
    progress,
    positions,
    reach,
    practice: {
      forLesson: async () => ITEMS,
      find: async (id) => ITEMS.find((i) => i.id === id),
    },
    gaps: async () => ({ gaps: over.gaps ?? quiz.gaps, level: over.level ?? quiz.level }),
    quiz: async () => quiz,
    offers,
    now: over.now,
  });
  return { port, progress, positions, reach, offers };
}

/** The saves the screens make when a learner goes through why-did-it-happen to the end. */
export async function walkWholeLesson(port: LearnPort, learnerId: string, lessonId: string) {
  for (const position of [
    { step: 1, item: 0 },
    { step: 2, item: 0 },
    { step: 2, item: 1 },
    { step: 2, item: 2 },
  ])
    await port.savePosition(learnerId, lessonId, position);
}
