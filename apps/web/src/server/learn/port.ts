/**
 * What the Learn screens need from the server (docs/PLAN.md section 6.3, BB-56).
 *
 * Pages and actions talk only to this port. The implementation in `service.ts` sits on
 * `packages/learn` and never imports mastery or level code to change anything: practice in Learn
 * never changes a level (AGENTS.md rule 10).
 */
import type { Lesson, LessonSubject } from '@basabridge/learn';

/** What the learner sees. `packages/learn` also has `in_progress`, which shows as `new`. */
export type LessonStatus = 'new' | 'waiting_for_story' | 'learned';

export interface LessonCardData {
  lesson: Lesson;
  status: LessonStatus;
}

export interface LearnHomeData {
  /** Lessons for the learner's gaps, most needed first. Reviewed lessons only. */
  recommended: LessonCardData[];
  /** Every lesson the learner may see, grouped by subject in the order of `LessonSubject`. */
  bySkill: { subject: LessonSubject; cards: LessonCardData[] }[];
}

/** Where the learner stopped: a step of the lesson, and a practice item inside a practice step. */
export interface LessonPosition {
  step: number;
  item: number;
}

export interface PracticeItemView {
  id: string;
  /** The short passage the question is about, when the item has one. */
  passage?: string;
  prompt: string;
  options: string[];
  hint: string;
}

export interface PracticeCheck {
  correct: boolean;
  correctText: string;
}

export interface ResultOffer {
  /** Show the Learn button on the result screen. */
  onResult: boolean;
  /** The lessons to list under "What Learn will teach". */
  lessons: { lesson: Lesson; misses: number }[];
}

export interface LearnPort {
  home(learnerId: string): Promise<LearnHomeData>;
  /** Null when there is no reviewed lesson with this id. */
  lesson(
    learnerId: string,
    lessonId: string,
  ): Promise<{ lesson: Lesson; position: LessonPosition } | null>;
  savePosition(learnerId: string, lessonId: string, position: LessonPosition): Promise<void>;
  /** Practice items without their answers. Throws NotWiredError until BB-54 supplies them. */
  practiceItems(lessonId: string): Promise<PracticeItemView[]>;
  /** Checks one choice on the server. Never touches a level. */
  checkPractice(input: { itemId: string; index: number }): Promise<PracticeCheck>;
  /** The learner reached the end. Queues `LEARN_RULES.recheckItemsInNextStory` for the next story. */
  complete(learnerId: string, lessonId: string): Promise<{ recheckItems: number }>;
  /** What the not-passed result screen offers for one session of this learner. */
  resultOffer(learnerId: string, sessionId: string): Promise<ResultOffer>;
  /**
   * Decides whether the wrong answer in this quiz gets the small "Learn about this" link. The
   * server counts offers per quiz, so the browser cannot ask for more (rule 5).
   */
  claimInlineOffer(
    learnerId: string,
    sessionId: string,
  ): Promise<{ offer: false } | { offer: true; lessonId: string }>;
}
