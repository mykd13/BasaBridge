import type { AnswerSubmission } from '@basabridge/contracts';
import type { z } from 'zod';
import {
  Analysis,
  AnswerFeedback,
  LevelUpView,
  PlacementStep,
  QuestionView,
  Reading,
  ResultView,
  StudentHome,
  TryFinish,
} from './schemas';

/**
 * The data the student screens need, behind one narrow interface.
 *
 * Screens never query a database. They call these functions, which call whatever
 * implementation is registered. The learning engine registers the real one; until then
 * every call answers `unavailable` and screens say "not ready yet" instead of showing
 * made-up data (AGENTS.md rule 8).
 *
 * Every method takes the learner id from the session, never from the request, so a learner
 * can only ever ask about themselves. The implementation goes through the authorization layer.
 */

export type Outcome<T> = { ok: true; data: T } | { ok: false; reason: 'unavailable' | 'none' };

const unavailable = { ok: false, reason: 'unavailable' } as const;

type Raw<S extends z.ZodType> = Outcome<z.input<S>>;

export interface StudentData {
  getStudentHome(learnerId: string): Promise<Raw<typeof StudentHome>>;
  /** Start or continue the learner's reading of the next story. `mode` is set after stopping early. */
  getReading(learnerId: string, opts: { mode?: 'rest' | 'top' }): Promise<Raw<typeof Reading>>;
  /**
   * The learner stopped reading. `audio` means the chunks for `tryId` were uploaded and the
   * server should analyse them and count the try. `silent` is reading without a microphone.
   */
  finishTry(
    learnerId: string,
    input: { sessionId: string; tryId: string; mode: 'audio' | 'silent' },
  ): Promise<Raw<typeof TryFinish>>;
  getAnalysis(learnerId: string): Promise<Raw<typeof Analysis>>;
  /** The learner says a hard to hear word was read right. */
  markMisheard(learnerId: string, input: { index: number }): Promise<Outcome<null>>;
  getQuestion(learnerId: string): Promise<Raw<typeof QuestionView>>;
  /** The server scores the answer, counts it and records the accommodations. */
  submitAnswer(learnerId: string, input: AnswerSubmission): Promise<Raw<typeof AnswerFeedback>>;
  getResult(learnerId: string): Promise<Raw<typeof ResultView>>;
  getLevelUp(learnerId: string): Promise<Raw<typeof LevelUpView>>;
  getPlacementStep(learnerId: string): Promise<Raw<typeof PlacementStep>>;
  /** Begin placement, or the next placement story. */
  startPlacementStory(learnerId: string): Promise<Outcome<null>>;
  /** The learner chose to do placement later. */
  deferPlacement(learnerId: string): Promise<Outcome<null>>;
}

/** The default until the learning engine is wired in. Answers "not ready" to everything. */
export const unwiredStudentData: StudentData = {
  getStudentHome: async () => unavailable,
  getReading: async () => unavailable,
  finishTry: async () => unavailable,
  getAnalysis: async () => unavailable,
  markMisheard: async () => unavailable,
  getQuestion: async () => unavailable,
  submitAnswer: async () => unavailable,
  getResult: async () => unavailable,
  getLevelUp: async () => unavailable,
  getPlacementStep: async () => unavailable,
  startPlacementStory: async () => unavailable,
  deferPlacement: async () => unavailable,
};

let current: StudentData = unwiredStudentData;

/** Register the real implementation. Called once at server start, and by tests. */
export function setStudentData(impl: StudentData): void {
  current = impl;
}

export function resetStudentData(): void {
  current = unwiredStudentData;
}

/**
 * Run a call and check what came back against the schema. Anything that throws or does not
 * match is treated as unavailable, so a bad payload fails visibly and never reaches a screen.
 */
async function load<S extends z.ZodType>(
  schema: S,
  call: () => Promise<Outcome<unknown>>,
): Promise<Outcome<z.output<S>>> {
  let result: Outcome<unknown>;
  try {
    result = await call();
  } catch {
    return unavailable;
  }
  if (!result.ok) return result;
  const parsed = schema.safeParse(result.data);
  return parsed.success ? { ok: true, data: parsed.data } : unavailable;
}

export const student = {
  home: (id: string) => load(StudentHome, () => current.getStudentHome(id)),
  reading: (id: string, mode?: 'rest' | 'top') =>
    load(Reading, () => current.getReading(id, { mode })),
  finishTry: (id: string, input: { sessionId: string; tryId: string; mode: 'audio' | 'silent' }) =>
    load(TryFinish, () => current.finishTry(id, input)),
  analysis: (id: string) => load(Analysis, () => current.getAnalysis(id)),
  markMisheard: async (id: string, input: { index: number }): Promise<Outcome<null>> => {
    try {
      return await current.markMisheard(id, input);
    } catch {
      return unavailable;
    }
  },
  question: (id: string) => load(QuestionView, () => current.getQuestion(id)),
  answer: (id: string, input: AnswerSubmission) =>
    load(AnswerFeedback, () => current.submitAnswer(id, input)),
  result: (id: string) => load(ResultView, () => current.getResult(id)),
  levelUp: (id: string) => load(LevelUpView, () => current.getLevelUp(id)),
  placement: (id: string) => load(PlacementStep, () => current.getPlacementStep(id)),
  startPlacementStory: async (id: string): Promise<Outcome<null>> => {
    try {
      return await current.startPlacementStory(id);
    } catch {
      return unavailable;
    }
  },
  deferPlacement: async (id: string): Promise<Outcome<null>> => {
    try {
      return await current.deferPlacement(id);
    } catch {
      return unavailable;
    }
  },
};
