import { TIERS, triesFor } from '@basabridge/levels';
import { describe, expect, it } from 'vitest';
import {
  applyTry,
  bestTry,
  resumePoint,
  SessionError,
  sessionValues,
  startAnswering,
  type SessionState,
  type TrySummary,
} from './machine';

let n = 0;
function aTry(over: Partial<TrySummary> = {}): TrySummary {
  n += 1;
  return {
    id: `try-${n}`,
    completed: true,
    wordsRight: 9,
    wordsTotal: 10,
    wordsPerMinute: 60,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, n)),
    ...over,
  };
}

function session(level: number): SessionState {
  return { id: 's1', learnerId: 'l1', storyId: 'st1', ...sessionValues(level) };
}

/** Run tries through the machine the way the store does, returning every outcome. */
function run(level: number, tries: TrySummary[]) {
  let s = session(level);
  const done: TrySummary[] = [];
  const outcomes = [];
  for (const t of tries) {
    const r = applyTry(s, done, t);
    s = r.session;
    done.push(t);
    outcomes.push(r);
  }
  return { session: s, outcomes };
}

function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    if (e instanceof SessionError) return e.code;
    throw e;
  }
  return undefined;
}

describe('tries allowed', () => {
  it('are unlimited across the first tier', () => {
    const first = TIERS[0]!;
    expect(first.tries).toBeNull();
    for (const level of [first.from, first.to]) {
      const { session: s, outcomes } = run(
        level,
        Array.from({ length: 50 }, () => aTry({ completed: false })),
      );
      expect(s.triesAllowed).toBeNull();
      expect(s.triesUsed).toBe(50);
      expect(s.status).toBe('reading');
      expect(outcomes.every((o) => o.outcome === 'stopped_early')).toBe(true);
    }
  });

  it('come from the tier at both edges of every limited tier', () => {
    for (const tier of TIERS.filter((t) => t.tries !== null)) {
      for (const level of [tier.from, tier.to]) {
        const allowed = triesFor(level)!;
        expect(session(level).triesAllowed).toBe(allowed);
        const { session: s } = run(
          level,
          Array.from({ length: allowed }, () => aTry({ completed: false })),
        );
        expect(s.triesUsed).toBe(allowed);
        expect(s.status).toBe('done');
        expect(code(() => applyTry(s, [], aTry()))).toBe('not_reading');
      }
    }
  });

  it('refuses a try once none are left, even if the status was not moved on', () => {
    const limited = TIERS.find((t) => t.tries !== null)!;
    const s = { ...session(limited.from), triesUsed: limited.tries! };
    expect(code(() => applyTry(s, [], aTry()))).toBe('no_tries_left');
  });

  it('never lets tries used pass tries allowed for random sequences', () => {
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let round = 0; round < 200; round += 1) {
      const level = 1 + Math.floor(rand() * 100);
      let s = session(level);
      const done: TrySummary[] = [];
      for (let i = 0; i < 12; i += 1) {
        const t = aTry({ completed: rand() > 0.5, wordsRight: Math.floor(rand() * 11) });
        if (rand() < 0.2 && s.status === 'reading' && bestTry(done)) {
          s = startAnswering(s, done);
        }
        if (code(() => applyTry(s, done, t)) !== undefined) continue;
        s = applyTry(s, done, t).session;
        done.push(t);
        if (s.triesAllowed !== null) expect(s.triesUsed).toBeLessThanOrEqual(s.triesAllowed);
        if (s.countedTryId) expect(done.find((d) => d.id === s.countedTryId)?.completed).toBe(true);
      }
    }
  });
});

describe('the counted try', () => {
  it('is never a try that stopped early, even with more words right', () => {
    const early = aTry({ completed: false, wordsRight: 10 });
    const full = aTry({ completed: true, wordsRight: 6 });
    expect(bestTry([early, full])?.id).toBe(full.id);
    expect(bestTry([early])).toBeNull();
  });

  it('is the best try: share of words right, then pace, then the earlier one', () => {
    const a = aTry({ wordsRight: 8 });
    const b = aTry({ wordsRight: 9, wordsPerMinute: 50 });
    const c = aTry({ wordsRight: 9, wordsPerMinute: 70 });
    const d = aTry({ wordsRight: 9, wordsPerMinute: 70 });
    expect(bestTry([a, b, c, d])?.id).toBe(c.id);
    expect(bestTry([a, b])?.id).toBe(b.id);
  });

  it('is the best try when tries run out', () => {
    const level = TIERS.find((t) => t.tries === 3)!.from;
    const good = aTry({ wordsRight: 10 });
    const { session: s, outcomes } = run(level, [
      aTry({ wordsRight: 7 }),
      good,
      aTry({ completed: false }),
    ]);
    expect(outcomes.map((o) => o.outcome)).toEqual(['can_answer', 'can_answer', 'answering']);
    expect(s.status).toBe('answering');
    expect(s.countedTryId).toBe(good.id);
  });

  it('is none when tries run out and no try reached the end', () => {
    const level = TIERS.find((t) => t.tries === 2)!.from;
    const { session: s, outcomes } = run(level, [
      aTry({ completed: false }),
      aTry({ completed: false }),
    ]);
    expect(outcomes.at(-1)!.outcome).toBe('tries_used_up');
    expect(s.status).toBe('done');
    expect(s.countedTryId).toBeNull();
  });

  it('is the best try so far when the learner chooses to answer early', () => {
    const level = TIERS.find((t) => t.tries === 5)!.from;
    const best = aTry({ wordsRight: 10 });
    const tries = [best, aTry({ wordsRight: 8 })];
    const { session: s } = run(level, tries);
    const answering = startAnswering(s, tries);
    expect(answering.status).toBe('answering');
    expect(answering.countedTryId).toBe(best.id);
  });

  it('cannot be chosen early without a try that reached the end', () => {
    const tries = [aTry({ completed: false })];
    const { session: s } = run(1, tries);
    expect(code(() => startAnswering(s, tries))).toBe('no_completed_try');
  });
});

describe('resume', () => {
  it('lands on reading with the tries left', () => {
    const level = TIERS.find((t) => t.tries === 4)!.from;
    const tries = [aTry({ completed: false })];
    const { session: s } = run(level, tries);
    expect(resumePoint(s, tries, ['q1'], [])).toEqual({
      step: 'reading',
      triesUsed: 1,
      triesLeft: 3,
      canAnswer: false,
    });
  });

  it('lands on the first unanswered question', () => {
    const tries = [aTry()];
    const s = startAnswering(run(1, tries).session, tries);
    expect(resumePoint(s, tries, ['q1', 'q2', 'q3'], ['q1'])).toEqual({
      step: 'answering',
      nextQuestionId: 'q2',
      answered: 1,
      total: 3,
    });
  });

  it('lands on done when the session is finished', () => {
    const s: SessionState = { ...session(1), status: 'done' };
    expect(resumePoint(s, [], ['q1'], [])).toEqual({ step: 'done' });
  });
});
