/**
 * The Learn port the app uses. Lesson text comes from the reviewed registry in `packages/learn`.
 *
 * Still to wire, each one fails visibly with NotWiredError and is never faked:
 * - practice items: BB-54 generates them
 * - quiz facts (wrong answers, pass, gaps): the session store has no Drizzle adapter until BB-10
 * - who the learner is: sign-in, BB-12 (`learner.ts`)
 *
 * Lesson progress and the step position are kept in this server process until the BB-10 adapter
 * and a position column exist, so they reset when the server restarts. They start empty.
 */
import { lessonRegistry, memoryLessonProgressStore } from '@basabridge/learn';
import { NotWiredError } from '@/server/errors';
import {
  createLearnPort,
  memoryOfferCounter,
  memoryPositionStore,
  memoryReachStore,
  type PracticeItemSource,
} from './service';
import type { LearnPort } from './port';

const practice: PracticeItemSource = {
  async forLesson() {
    throw new NotWiredError('Practice items (BB-54)');
  },
  async find() {
    throw new NotWiredError('Practice items (BB-54)');
  },
};

const globalForLearn = globalThis as unknown as { __bbLearnPort?: LearnPort };

export function learnPort(): LearnPort {
  globalForLearn.__bbLearnPort ??= createLearnPort({
    registry: lessonRegistry(),
    progress: memoryLessonProgressStore(),
    positions: memoryPositionStore(),
    reach: memoryReachStore(),
    practice,
    quiz: async () => {
      throw new NotWiredError('Quiz results for Learn offers (BB-10)');
    },
    offers: memoryOfferCounter(),
  });
  return globalForLearn.__bbLearnPort;
}
