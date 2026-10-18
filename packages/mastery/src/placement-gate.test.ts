import { describe, expect, it } from 'vitest';
import type { PlacementResult } from '@basabridge/contracts';
import { PLACEMENT_RULE } from '@basabridge/levels';
import { finishPlacement, nextPlacement, skipPlacement, startLevelForGrade } from './placement';
import {
  learnOffersAllowed,
  mainCourseLocked,
  placementGate,
  type PlacementGate,
  type PlacementSnapshot,
} from './placement-gate';

const NOW = new Date('2026-10-18T09:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

function snapshot(over: Partial<PlacementSnapshot>): PlacementSnapshot {
  return {
    latest: { status: 'none' },
    grade: 3,
    mic: 'granted',
    newSignIn: false,
    now: NOW,
    ...over,
  };
}

const twoStories = {
  startLevel: 30,
  stories: [
    { level: 30, answers: [{ correct: true }, { correct: true }, { correct: false }] },
    { level: 35, answers: [{ correct: true }, { correct: false }, { correct: true }] },
  ],
};
const withVoice: PlacementResult = finishPlacement(
  {
    ...twoStories,
    stories: twoStories.stories.map((s) => ({ ...s, wordsRightShare: 0.95 })),
  },
  { voice: true },
);
const silent: PlacementResult = finishPlacement(twoStories, { voice: false });

function finished(
  result: PlacementResult,
  daysAgo: number,
  voice = true,
): PlacementSnapshot['latest'] {
  return {
    status: 'finished',
    result,
    voice,
    finishedAt: new Date(NOW.getTime() - daysAgo * DAY_MS),
  };
}

describe('no finished placement', () => {
  it('sends the learner to the placement start and locks the main course', () => {
    const gate = placementGate(snapshot({ grade: 3 }));
    expect(gate).toEqual({ kind: 'start', voiceMode: 'voice', startLevel: startLevelForGrade(3) });
    expect(mainCourseLocked(gate)).toBe(true);
  });

  it('uses the default start without a grade', () => {
    const gate = placementGate(snapshot({ grade: null }));
    expect(gate.kind === 'start' && gate.startLevel).toBe(PLACEMENT_RULE.defaultStart);
  });
});

describe('"Do this later"', () => {
  const latest = { status: 'skipped', at: new Date(NOW.getTime() - DAY_MS) } as const;

  it('opens the main course and offers placement again at the next sign-in', () => {
    const gate = placementGate(snapshot({ latest, newSignIn: true }));
    expect(gate).toEqual({ kind: 'open', offerPlacement: true, retakeAllowed: true });
    expect(mainCourseLocked(gate)).toBe(false);
  });

  it('does not ask again within the same sign-in', () => {
    const gate = placementGate(snapshot({ latest, newSignIn: false }));
    expect(gate).toEqual({ kind: 'open', offerPlacement: false, retakeAllowed: true });
  });

  it('pairs with a grade-default start at low confidence', () => {
    const r = skipPlacement(3);
    expect(r.level).toBe(startLevelForGrade(3));
    expect(r.confidence).toBe('none');
  });
});

describe('under 13 without guardian approval', () => {
  it('runs a silent placement', () => {
    const gate = placementGate(snapshot({ mic: 'not_allowed_yet' }));
    expect(gate.kind === 'start' && gate.voiceMode).toBe('silent');
  });

  it('keeps the main course open while voice is still not approved', () => {
    const gate = placementGate(
      snapshot({ latest: finished(silent, 1, false), mic: 'not_allowed_yet' }),
    );
    expect(gate.kind).toBe('open');
  });

  it('runs a short re-check once voice is approved', () => {
    expect(silent.flags).toContain('voice_missing');
    const gate = placementGate(snapshot({ latest: finished(silent, 1, false), mic: 'granted' }));
    expect(gate).toEqual({ kind: 'recheck', startLevel: silent.level });
    expect(mainCourseLocked(gate)).toBe(true);
  });

  it('never re-checks a placement that had voice', () => {
    const gate = placementGate(snapshot({ latest: finished(withVoice, 1), mic: 'granted' }));
    expect(gate.kind).toBe('open');
  });
});

describe('abandoned placement', () => {
  it('resumes at the story where it stopped', () => {
    const gate = placementGate(
      snapshot({ latest: { status: 'in_progress', state: twoStories, voice: true } }),
    );
    expect(gate).toEqual({
      kind: 'resume',
      voiceMode: 'voice',
      recheck: false,
      nextLevel: nextPlacement(twoStories).level,
    });
    expect(mainCourseLocked(gate)).toBe(true);
  });

  it('stays silent when it started silent, even if the microphone is now allowed', () => {
    const gate = placementGate(
      snapshot({
        latest: { status: 'in_progress', state: twoStories, voice: false },
        mic: 'granted',
      }),
    );
    expect(gate.kind === 'resume' && gate.voiceMode).toBe('silent');
  });

  it('drops to silent when the microphone is no longer allowed', () => {
    const gate = placementGate(
      snapshot({
        latest: { status: 'in_progress', state: twoStories, voice: true },
        mic: 'blocked',
      }),
    );
    expect(gate.kind === 'resume' && gate.voiceMode).toBe('silent');
  });

  it('resumes a re-check with the re-check length', () => {
    const gate = placementGate(
      snapshot({
        latest: { status: 'in_progress', state: twoStories, voice: true, recheck: true },
      }),
    );
    // Two stories is the whole re-check, so only the finish is left.
    expect(gate).toEqual({ kind: 'resume', voiceMode: 'voice', recheck: true, nextLevel: null });
  });
});

describe('retake', () => {
  it('is allowed only after the retake wait', () => {
    const before = placementGate(
      snapshot({ latest: finished(withVoice, PLACEMENT_RULE.retakeAfterDays - 1) }),
    );
    const after = placementGate(
      snapshot({ latest: finished(withVoice, PLACEMENT_RULE.retakeAfterDays) }),
    );
    expect(before).toEqual({ kind: 'open', offerPlacement: false, retakeAllowed: false });
    expect(after).toEqual({ kind: 'open', offerPlacement: false, retakeAllowed: true });
  });
});

describe('Learn offers', () => {
  const gates: PlacementGate[] = [
    { kind: 'start', voiceMode: 'voice', startLevel: 30 },
    { kind: 'resume', voiceMode: 'silent', recheck: false, nextLevel: 30 },
    { kind: 'recheck', startLevel: 30 },
  ];

  it.each(gates)('are off during placement ($kind)', (gate) => {
    expect(learnOffersAllowed(gate)).toBe(false);
  });

  it('are on once the main course is open', () => {
    expect(learnOffersAllowed({ kind: 'open', offerPlacement: true, retakeAllowed: false })).toBe(
      true,
    );
  });
});
