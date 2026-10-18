import { describe, expect, it } from 'vitest';
import { PLACEMENT_BANK, PLACEMENT_RULE, placementSteps } from '@basabridge/levels';
import { guessFor, itemDifficulty, levelToTheta, pCorrect } from './ability';
import {
  chooseBankStory,
  finishPlacement,
  nextPlacement,
  PLACEMENT_SUPPORTS,
  placementPosterior,
  placementVoiceMode,
  startLevelForGrade,
  type BankCandidate,
  type PlacementState,
  type PlacementStory,
} from './placement';

/** Test-only bank: `perStep` stories at every step, ids like `s45-a`. Never used by app code. */
function testBank(perStep: number = PLACEMENT_BANK.minStoriesPerStep): BankCandidate[] {
  return placementSteps().flatMap((level) =>
    Array.from({ length: perStep }, (_, i) => ({
      id: `s${level}-${String.fromCharCode(97 + i)}`,
      level,
    })),
  );
}

/** One full placement that draws every story from the bank. Returns the ids it showed. */
function runBankPlacement(
  trueLevel: number,
  grade: number,
  bank: readonly BankCandidate[],
  shownBefore: readonly string[] = [],
): { state: PlacementState; shown: string[] } {
  const state: PlacementState = { startLevel: startLevelForGrade(grade), stories: [] };
  for (let i = 0; i < 10; i++) {
    const next = nextPlacement(state);
    if (next.done || next.level == null)
      return { state, shown: state.stories.map((s) => s.storyId!) };
    const pick = chooseBankStory({
      targetLevel: next.level,
      candidates: bank,
      shownThisPlacement: state.stories.map((s) => s.storyId!),
      shownBefore,
    });
    if (!pick) throw new Error(`no bank story near level ${next.level}`);
    state.stories.push({ ...simulate(trueLevel, pick.level), storyId: pick.storyId });
  }
  throw new Error('placement did not stop');
}

/** Stand-in for a learner whose true ability matches `trueLevel`: expected correct answers, rounded. */
function simulate(trueLevel: number, storyLevel: number, wordsRightShare = 0.95): PlacementStory {
  const theta = levelToTheta(trueLevel);
  const p = pCorrect(theta, {
    difficulty: itemDifficulty(storyLevel),
    guess: guessFor('multiple_choice'),
  });
  const rightCount = Math.round(5 * p);
  return {
    level: storyLevel,
    wordsRightShare,
    answers: Array.from({ length: 5 }, (_, i) => ({ correct: i < rightCount })),
  };
}

function runPlacement(trueLevel: number, grade: number): { state: PlacementState; steps: number } {
  const state: PlacementState = { startLevel: startLevelForGrade(grade), stories: [] };
  let steps = 0;
  for (;;) {
    const next = nextPlacement(state);
    if (next.done || next.level == null) break;
    state.stories.push(simulate(trueLevel, next.level));
    steps++;
    if (steps > 10) throw new Error('placement did not stop');
  }
  return { state, steps };
}

describe('startLevelForGrade', () => {
  it('rises with grade and has a default', () => {
    expect(startLevelForGrade(1)).toBeLessThan(startLevelForGrade(6));
    expect(startLevelForGrade(null)).toBe(PLACEMENT_RULE.defaultStart);
    expect(startLevelForGrade(undefined)).toBe(PLACEMENT_RULE.defaultStart);
    expect(startLevelForGrade(9)).toBe(PLACEMENT_RULE.defaultStart);
  });
});

describe('nextPlacement', () => {
  it('starts at the grade level', () => {
    const next = nextPlacement({ startLevel: 30, stories: [] });
    expect(next.done).toBe(false);
    expect(next.level).toBe(30);
  });

  it('moves up after a strong first story and down after a weak one', () => {
    const strong = nextPlacement({
      startLevel: 30,
      stories: [{ level: 30, answers: Array.from({ length: 5 }, () => ({ correct: true })) }],
    });
    const weak = nextPlacement({
      startLevel: 30,
      stories: [{ level: 30, answers: Array.from({ length: 5 }, () => ({ correct: false })) }],
    });
    expect(strong.level!).toBeGreaterThan(30);
    expect(weak.level!).toBeLessThan(30);
  });

  it('limits how far the next story can jump', () => {
    const next = nextPlacement({
      startLevel: 10,
      stories: [{ level: 10, answers: Array.from({ length: 5 }, () => ({ correct: true })) }],
    });
    expect(next.level!).toBeLessThanOrEqual(10 + PLACEMENT_RULE.maxStep);
  });

  it('stops after the maximum number of stories', () => {
    const stories = Array.from({ length: PLACEMENT_RULE.maxStories }, () => ({
      level: 30,
      answers: [{ correct: true }, { correct: false }],
    }));
    expect(nextPlacement({ startLevel: 30, stories }).done).toBe(true);
  });
});

describe('placement end to end', () => {
  it.each([
    [15, 3],
    [45, 4],
    [80, 6],
  ])('lands near a learner at level %i (grade %i)', (trueLevel, grade) => {
    const { state, steps } = runPlacement(trueLevel, grade);
    const result = finishPlacement(state, { voice: true });
    expect(steps).toBeGreaterThanOrEqual(PLACEMENT_RULE.minStories);
    expect(steps).toBeLessThanOrEqual(PLACEMENT_RULE.maxStories);
    // Starts at or a little below the true level, never far above it.
    expect(result.level).toBeLessThanOrEqual(trueLevel + 8);
    expect(result.level).toBeGreaterThanOrEqual(trueLevel - 30);
  });

  it('starts a little below the estimate', () => {
    const { state } = runPlacement(45, 4);
    const result = finishPlacement(state, { voice: true });
    expect(result.level).toBeLessThanOrEqual(Math.round(((result.theta + 3) / 6) * 99 + 1));
  });
});

describe('chooseBankStory', () => {
  const none = { shownThisPlacement: [], shownBefore: [] };

  it('picks a story at the step nearest the target level', () => {
    const pick = chooseBankStory({ targetLevel: 43, candidates: testBank(), ...none });
    expect(pick).toEqual({ storyId: 's45-a', level: 45, reused: false });
  });

  it('gives a retake a different story at the same step', () => {
    const pick = chooseBankStory({
      targetLevel: 45,
      candidates: testBank(),
      shownThisPlacement: [],
      shownBefore: ['s45-a'],
    });
    expect(pick).toEqual({ storyId: 's45-b', level: 45, reused: false });
  });

  it('reuses an earlier story only when the step has nothing new', () => {
    const pick = chooseBankStory({
      targetLevel: 45,
      candidates: testBank(),
      shownThisPlacement: [],
      shownBefore: ['s45-a', 's45-b'],
    });
    expect(pick).toEqual({ storyId: 's45-a', level: 45, reused: true });
  });

  it('never shows the same story twice in one placement', () => {
    const pick = chooseBankStory({
      targetLevel: 45,
      candidates: [
        { id: 'only', level: 45 },
        { id: 'next-door', level: 50 },
      ],
      shownThisPlacement: ['only'],
      shownBefore: [],
    });
    expect(pick?.storyId).toBe('next-door');
  });

  it('falls back to the nearest step, the lower one on a tie', () => {
    const candidates = [
      { id: 'low', level: 40 },
      { id: 'high', level: 50 },
      { id: 'far', level: 60 },
    ];
    expect(chooseBankStory({ targetLevel: 45, candidates, ...none })?.storyId).toBe('low');
    expect(chooseBankStory({ targetLevel: 55, candidates, ...none })?.storyId).toBe('high');
  });

  it('never strays further than the largest placement step', () => {
    const far = PLACEMENT_RULE.maxStep + PLACEMENT_BANK.stepSize;
    const pick = chooseBankStory({
      targetLevel: 30,
      candidates: [{ id: 'far', level: 30 + far }],
      ...none,
    });
    expect(pick).toBeNull();
  });

  it('returns null for an empty bank', () => {
    expect(chooseBankStory({ targetLevel: 30, candidates: [], ...none })).toBeNull();
  });

  it('does not depend on the order of the candidates', () => {
    const bank = testBank();
    const a = chooseBankStory({ targetLevel: 62, candidates: bank, ...none });
    const b = chooseBankStory({ targetLevel: 62, candidates: [...bank].reverse(), ...none });
    expect(a).toEqual(b);
  });
});

describe('placement with the bank', () => {
  const bank = testBank();
  const steps = new Set(placementSteps());

  it.each([
    [15, 3],
    [45, 4],
    [80, 6],
  ])('only reads stories at bank steps (level %i, grade %i)', (trueLevel, grade) => {
    const { state } = runBankPlacement(trueLevel, grade, bank);
    expect(state.stories.every((s) => steps.has(s.level))).toBe(true);
    const ids = state.stories.map((s) => s.storyId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each([
    [15, 3],
    [45, 4],
    [80, 6],
  ])(
    'reuses a story on a retake only when its step has nothing new (level %i, grade %i)',
    (trueLevel, grade) => {
      const first = runBankPlacement(trueLevel, grade, bank);
      const retake = runBankPlacement(trueLevel, grade, bank, first.shown);
      retake.state.stories.forEach((story, i) => {
        if (!first.shown.includes(story.storyId!)) return;
        // Every other story at this step was seen before or already shown in this retake.
        const shownSoFar = new Set([...first.shown, ...retake.shown.slice(0, i)]);
        const unseenAtStep = bank.filter((c) => c.level === story.level && !shownSoFar.has(c.id));
        expect(unseenAtStep).toEqual([]);
      });
    },
  );

  it('gives a retake a new story at every step when the bank is deep enough', () => {
    const deep = testBank(PLACEMENT_RULE.maxStories * 2);
    const first = runBankPlacement(45, 4, deep);
    const retake = runBankPlacement(45, 4, deep, first.shown);
    expect(retake.shown.some((id) => first.shown.includes(id))).toBe(false);
  });
});

describe('placement voice mode and supports', () => {
  it('uses voice only when the microphone is granted', () => {
    expect(placementVoiceMode('granted')).toBe('voice');
    expect(placementVoiceMode('blocked')).toBe('silent');
    expect(placementVoiceMode('unavailable')).toBe('silent');
    expect(placementVoiceMode('not_allowed_yet')).toBe('silent');
  });

  it('offers no supports during placement', () => {
    expect(Object.values(PLACEMENT_SUPPORTS).every((on) => on === false)).toBe(true);
  });
});

describe('finishPlacement flags', () => {
  const base: PlacementState = {
    startLevel: 30,
    stories: [
      {
        level: 30,
        wordsRightShare: 0.95,
        answers: [{ correct: true }, { correct: true }, { correct: false }],
      },
      {
        level: 35,
        wordsRightShare: 0.9,
        answers: [{ correct: true }, { correct: false }, { correct: true }],
      },
      {
        level: 35,
        wordsRightShare: 0.92,
        answers: [{ correct: true }, { correct: true }, { correct: true }],
      },
    ],
  };

  it('flags a placement made without voice and caps its confidence', () => {
    const r = finishPlacement(base, { voice: false });
    expect(r.flags).toContain('voice_missing');
    expect(['early', 'none']).toContain(r.confidence);
  });

  it('flags low decoding and recommends more reading help', () => {
    const low: PlacementState = {
      ...base,
      stories: base.stories.map((s) => ({ ...s, wordsRightShare: 0.7 })),
    };
    const r = finishPlacement(low, { voice: true });
    expect(r.flags).toContain('low_decoding');
    expect(r.recommendedHelp).toBe('more');
  });

  it('flags a placement with too few stories', () => {
    const r = finishPlacement({ ...base, stories: base.stories.slice(0, 2) }, { voice: true });
    expect(r.flags).toContain('few_stories');
  });

  it('recommends more help at low levels', () => {
    const r = finishPlacement(
      { startLevel: 5, stories: [{ level: 5, answers: [{ correct: false }, { correct: false }] }] },
      { voice: true },
    );
    expect(r.level).toBeLessThanOrEqual(20);
    expect(r.recommendedHelp).toBe('more');
  });

  it('leaves skipped reads out of the decoding average instead of scoring them zero', () => {
    const withSkip: PlacementState = {
      ...base,
      stories: [
        { ...base.stories[0]!, wordsRightShare: undefined },
        base.stories[1]!,
        base.stories[2]!,
      ],
    };
    const r = finishPlacement(withSkip, { voice: true });
    expect(r.flags).not.toContain('low_decoding');
    expect(r.flags).not.toContain('voice_missing');
  });

  it('flags voice_missing when voice was on but every read was skipped', () => {
    const allSkipped: PlacementState = {
      ...base,
      stories: base.stories.map((s) => ({ ...s, wordsRightShare: undefined })),
    };
    const r = finishPlacement(allSkipped, { voice: true });
    expect(r.flags).toContain('voice_missing');
    expect(r.flags).not.toContain('low_decoding');
  });

  it('keeps the posterior a valid distribution', () => {
    const p = placementPosterior(base);
    expect(p.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    expect(p.items).toBe(9);
  });
});
