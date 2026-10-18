/**
 * Server-side scoring of answers (AGENTS.md rule 5). The browser sends what the learner picked and
 * how long it took. Everything else is decided here.
 */
import type { Accommodation } from '@basabridge/contracts';
import type { PublicQuestion } from '@basabridge/contracts/engine';
import { EVIDENCE_RULE } from '@basabridge/levels';
import { evidenceWeight, isRushed } from '@basabridge/mastery';
import { EngineError } from './errors';
import type { AnswerEntry, AnswerKey, StoredQuestion } from './types';

export function toPublicQuestion(q: StoredQuestion): PublicQuestion {
  return { id: q.id, type: q.type, skill: q.skill, question: q.question, options: q.options };
}

/** Indexes that are right, in answer order. Sent back only after the learner has answered. */
export function keyIndexes(key: AnswerKey): number[] {
  switch (key.kind) {
    case 'single':
      return [key.index];
    case 'multi':
      return [...key.indexes].sort((a, b) => a - b);
    case 'order':
      return key.order;
  }
}

/** Throws `bad_choice` when the pick is not a valid answer shape for the question. */
export function validateChoice(q: StoredQuestion, chosen: number[]): void {
  const n = q.options.length;
  const inRange = chosen.every((i) => Number.isInteger(i) && i >= 0 && i < n);
  const unique = new Set(chosen).size === chosen.length;
  if (!inRange || !unique) throw new EngineError('bad_choice');
  if (q.type === 'multiple_choice' && chosen.length !== 1) throw new EngineError('bad_choice');
  if (q.type === 'order_events' && chosen.length !== n) throw new EngineError('bad_choice');
}

export function isCorrect(q: StoredQuestion, chosen: number[]): boolean {
  switch (q.key.kind) {
    case 'single':
      return chosen.length === 1 && chosen[0] === q.key.index;
    case 'multi': {
      const want = new Set(q.key.indexes);
      return chosen.length === want.size && chosen.every((i) => want.has(i));
    }
    case 'order': {
      const order = q.key.order;
      return chosen.length === order.length && chosen.every((v, i) => v === order[i]);
    }
  }
}

/** Words the learner has to read to answer. Used for the rushed-answer threshold. */
export function wordsOnScreen(q: StoredQuestion): number {
  return [q.question, ...q.options].join(' ').split(/\s+/).filter(Boolean).length;
}

export interface ScoreInput {
  question: StoredQuestion;
  chosen: number[];
  responseMs: number;
  accommodations: Accommodation[];
  /** The counted try was a supported try (listened first). Set by the server. */
  supportedTry: boolean;
}

/** Score one answer. Rushed answers and answers after a supported try count for less (ADR 0003). */
export function scoreAnswer(i: ScoreInput): AnswerEntry {
  validateChoice(i.question, i.chosen);
  // The browser reports the time, so it is capped before it feeds any evidence rule.
  const responseMs = Math.min(Math.max(0, i.responseMs), EVIDENCE_RULE.maxResponseMs);
  const rushed = isRushed(responseMs, wordsOnScreen(i.question));
  const accommodations: Accommodation[] = [...new Set(i.accommodations)];
  if (i.supportedTry && !accommodations.includes('supported_try')) {
    accommodations.push('supported_try');
  }
  return {
    questionId: i.question.id,
    chosen: i.chosen,
    correct: isCorrect(i.question, i.chosen),
    responseMs,
    rushed,
    accommodations,
    weight: evidenceWeight({ rushed, supportedTry: i.supportedTry }),
  };
}
