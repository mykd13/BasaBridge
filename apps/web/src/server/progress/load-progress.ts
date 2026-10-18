import type { ComprehensionSkill } from '@basabridge/contracts';
import type { SessionUser } from '../session';
import { NotWiredError } from '../errors';

/**
 * One finished story on My progress. Every number comes from the server. The page formats
 * these and never computes from them (AGENTS.md rules 1 and 6).
 */
export interface RecentReading {
  id: string;
  title: string;
  finishedAt: Date;
  /** Tries used on the story, counted by the server (rule 5). */
  triesUsed: number;
  questionsCorrect: number;
  questionsTotal: number;
}

/** Where the learner stands on the way to the next level. Computed by packages/mastery. */
export interface NextLevelProgress {
  /** A level from 1 to the top, the shape of `Level` in packages/contracts. */
  level: number;
  /** From 0 to 1. */
  progress: number;
  /** Stories still needed, from the level movement rule. */
  storiesLeft: number;
}

/**
 * What the page shows. The shapes reuse `Level` and the `LearnPlan` focus skill from
 * packages/contracts. A shared contract for the rest is proposed in the PR (Rhett's area).
 */
export interface ProgressView {
  /** A level from 1 to the top, the shape of `Level` in packages/contracts. */
  level: number;
  /** From packages/levels (`MAX_LEVEL`). The page never writes the number itself. */
  maxLevel: number;
  /** null at the top level. */
  next: NextLevelProgress | null;
  /** null until the engine has enough evidence to pick one. */
  focusSkill: ComprehensionSkill | null;
  /** Newest first. Empty until the learner finishes a story. */
  recent: RecentReading[];
}

/**
 * The signed-in learner's progress, or null when they have no finished story yet.
 * Throws NotWiredError until BB-10 (authorization layer) and the BB-19 reads land:
 * no page or route may query learner tables directly (rule 4).
 */
export async function loadProgress(user: SessionUser): Promise<ProgressView | null> {
  void user;
  throw new NotWiredError(
    'My progress needs the BB-10 authorization layer and BB-19 mastery reads',
  );
}
