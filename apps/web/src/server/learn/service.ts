/**
 * The Learn port on top of `packages/learn` (BB-52). Everything it needs from outside is a
 * dependency, so tests pass fakes and the live wiring in `live.ts` says what is still missing.
 */
import {
  LEARN_RULES,
  finishLesson,
  learnHome,
  openLesson,
  shouldOfferLearn,
  type Gap,
  type Lesson,
  type LessonProgressStatus,
  type LessonProgressStore,
  type LessonRegistry,
  type LessonSubject,
} from '@basabridge/learn';
import type {
  LearnPort,
  LessonCardData,
  LessonPosition,
  LessonStatus,
  PracticeItemView,
} from './port';

/** A practice item as stored: the answer stays on the server. */
export interface PracticeItemKey extends PracticeItemView {
  answerIndex: number;
}

export interface PracticeItemSource {
  /** Items for a lesson. BB-54 generates and verifies them like stories. */
  forLesson(lessonId: string): Promise<PracticeItemKey[]>;
  find(itemId: string): Promise<PracticeItemKey | undefined>;
}

/** The step the learner stopped at. `lesson_progress` has no column for it yet (see the PR note). */
export interface PositionStore {
  get(learnerId: string, lessonId: string): Promise<LessonPosition | undefined>;
  set(learnerId: string, lessonId: string, position: LessonPosition): Promise<void>;
  clear(learnerId: string, lessonId: string): Promise<void>;
}

/** What a finished quiz says, from the session and the answers the server scored. */
export interface QuizFacts {
  wrongAnswers: number;
  passed: boolean;
  duringPlacement: boolean;
  gaps: Gap[];
  level: number;
}

export interface LearnDeps {
  registry: LessonRegistry;
  progress: LessonProgressStore;
  positions: PositionStore;
  practice: PracticeItemSource;
  /** The learner's gaps and level. Without it the recommendations stay empty. */
  gaps?: (learnerId: string) => Promise<{ gaps: Gap[]; level: number }>;
  quiz: (learnerId: string, sessionId: string) => Promise<QuizFacts>;
  /** Inline offers already made in this quiz. Counted here, never in the browser. */
  offers: { count(sessionId: string): number; add(sessionId: string): void };
  now?: () => Date;
}

const SUBJECT_ORDER: LessonSubject[] = [
  'word_in_context',
  'word_parts',
  'key_detail',
  'sequence',
  'main_idea',
  'cause_effect',
  'feelings',
  'prediction',
  'conclusion',
  'decoding',
  'word_practice',
];

export function displayStatus(card: LessonProgressStatus): LessonStatus {
  return card === 'in_progress' ? 'new' : card;
}

export function clampPosition(lesson: Lesson, p: LessonPosition): LessonPosition | null {
  if (!Number.isInteger(p.step) || !Number.isInteger(p.item)) return null;
  if (p.step < 0 || p.step >= lesson.steps.length || p.item < 0) return null;
  return { step: p.step, item: p.item };
}

export function createLearnPort(deps: LearnDeps): LearnPort {
  const { registry, progress, positions, practice } = deps;
  const now = deps.now ?? (() => new Date());

  const toCard = (c: { lesson: Lesson; status: LessonProgressStatus }) =>
    ({ lesson: c.lesson, status: displayStatus(c.status) }) satisfies LessonCardData;

  return {
    async home(learnerId) {
      const source = deps.gaps ? await deps.gaps(learnerId) : { gaps: [], level: 1 };
      const home = learnHome({
        gaps: source.gaps,
        level: source.level,
        registry,
        progress: await progress.list(learnerId),
      });
      const bySkill = SUBJECT_ORDER.flatMap((subject) => {
        const cards = home.all.filter((c) => c.lesson.subject === subject).map(toCard);
        return cards.length > 0 ? [{ subject, cards }] : [];
      });
      return { recommended: home.recommended.map(toCard), bySkill };
    },

    async lesson(learnerId, lessonId) {
      const lesson = registry.get(lessonId);
      if (!lesson) return null;
      const saved = await positions.get(learnerId, lessonId);
      return { lesson, position: (saved && clampPosition(lesson, saved)) ?? { step: 0, item: 0 } };
    },

    async savePosition(learnerId, lessonId, position) {
      const lesson = registry.get(lessonId);
      if (!lesson) return;
      const valid = clampPosition(lesson, position);
      if (!valid) return;
      await openLesson(progress, registry, learnerId, lessonId);
      await positions.set(learnerId, lessonId, valid);
    },

    async practiceItems(lessonId) {
      const items = await practice.forLesson(lessonId);
      return items.map(({ answerIndex: _answerIndex, ...view }) => view);
    },

    async checkPractice({ itemId, index }) {
      const item = await practice.find(itemId);
      const correctText = item?.options[item.answerIndex];
      if (!item || correctText === undefined) return { correct: false, correctText: '' };
      return { correct: index === item.answerIndex, correctText };
    },

    async complete(learnerId, lessonId) {
      // The place is cleared when a lesson is finished, so a repeat call (a refresh of the done
      // page) with no new walk through the lesson must not reset a recheck already counted.
      const row = (await progress.list(learnerId)).find((r) => r.lessonId === lessonId);
      const repeat = row?.completedAt && !(await positions.get(learnerId, lessonId));
      if (!repeat) await finishLesson(progress, registry, learnerId, lessonId, now());
      await positions.clear(learnerId, lessonId);
      return { recheckItems: LEARN_RULES.recheckItemsInNextStory };
    },

    async resultOffer(learnerId, sessionId) {
      const quiz = await deps.quiz(learnerId, sessionId);
      const offer = shouldOfferLearn({
        wrongAnswers: quiz.wrongAnswers,
        inlineOffersShown: deps.offers.count(sessionId),
        passed: quiz.passed,
        duringPlacement: quiz.duringPlacement,
      });
      if (!offer.onResult) return { onResult: false, lessons: [] };
      const home = learnHome({
        gaps: quiz.gaps,
        level: quiz.level,
        registry,
        progress: await progress.list(learnerId),
      });
      const lessons = home.recommended.map(({ lesson }) => ({
        lesson,
        misses: quiz.gaps.find((g) => g.subject === lesson.subject)?.misses ?? 0,
      }));
      return { onResult: lessons.length > 0, lessons };
    },

    async claimInlineOffer(learnerId, sessionId) {
      const quiz = await deps.quiz(learnerId, sessionId);
      const offer = shouldOfferLearn({
        wrongAnswers: quiz.wrongAnswers,
        inlineOffersShown: deps.offers.count(sessionId),
        passed: quiz.passed,
        duringPlacement: quiz.duringPlacement,
      });
      if (!offer.inline) return { offer: false };
      const home = learnHome({
        gaps: quiz.gaps,
        level: quiz.level,
        registry,
        progress: await progress.list(learnerId),
      });
      const first = home.recommended[0];
      if (!first) return { offer: false };
      deps.offers.add(sessionId);
      return { offer: true, lessonId: first.lesson.id };
    },
  };
}

export function memoryPositionStore(): PositionStore {
  const rows = new Map<string, LessonPosition>();
  const key = (learnerId: string, lessonId: string) => `${learnerId}\u0000${lessonId}`;
  return {
    async get(l, id) {
      return rows.get(key(l, id));
    },
    async set(l, id, p) {
      rows.set(key(l, id), p);
    },
    async clear(l, id) {
      rows.delete(key(l, id));
    },
  };
}

export function memoryOfferCounter() {
  const counts = new Map<string, number>();
  return {
    count: (sessionId: string) => counts.get(sessionId) ?? 0,
    add: (sessionId: string) => counts.set(sessionId, (counts.get(sessionId) ?? 0) + 1),
  };
}
