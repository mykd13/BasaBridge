/**
 * Decision log rows written by the session (docs/PLAN.md section 7, BB-36).
 * Evidence holds counts and ids only: no names, usernames, story text or audio (AGENTS.md rule 2).
 */
import type { Decision } from '@basabridge/contracts';
import type { SessionState, TrySummary } from './machine';

/** Written when the last try is used: which try counts, or that none reached the end. */
export function triesDecision(
  session: SessionState,
  tries: readonly TrySummary[],
  counted: TrySummary | null,
): Decision {
  const completedTries = tries.filter((t) => t.completed).length;
  return {
    kind: 'tries',
    title: counted ? 'Best try counted' : 'Tries used up',
    summary: counted
      ? 'All tries were used. The try with the most words read right counts.'
      : 'All tries were used and none reached the end. The next story is at the same level.',
    evidence: {
      sessionId: session.id,
      triesUsed: session.triesUsed,
      triesAllowed: session.triesAllowed,
      completedTries,
      countedTryId: counted?.id ?? null,
      countedWordsRight: counted?.wordsRight ?? null,
      countedWordsTotal: counted?.wordsTotal ?? null,
    },
  };
}
