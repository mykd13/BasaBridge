import { describe, expect, it } from 'vitest';
import { PlacementResult } from '@basabridge/contracts';
import { PLACEMENT_RULE } from '@basabridge/levels';
import { guessFor, itemDifficulty, levelToTheta, pCorrect, thetaToLevel } from './ability';
import {
  finishPlacement,
  finishRecheck,
  isSkippedPlacement,
  nextPlacement,
  nextRecheck,
  PLACEMENT_SUPPORTS,
  placementPosterior,
  placementVoiceMode,
  skipPlacement,
  startLevelForGrade,
  startRecheck,
  type PlacementState,
  type PlacementStory,
} from './placement';

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

describe('skipPlacement', () => {
  it('starts at the grade default with no confidence and a valid result', () => {
    const r = skipPlacement(4);
    expect(PlacementResult.parse(r)).toEqual(r);
    expect(r.level).toBe(startLevelForGrade(4));
    expect(r.confidence).toBe(PLACEMENT_RULE.skipConfidence);
    expect(r.storiesRead).toBe(0);
    expect(r.flags).toEqual([]);
  });

  it('uses the default start without a grade', () => {
    expect(skipPlacement(null).level).toBe(PLACEMENT_RULE.defaultStart);
  });

  it('is recognised as a skip, and a real placement is not', () => {
    expect(isSkippedPlacement(skipPlacement(3))).toBe(true);
    const real = finishPlacement(
      { startLevel: 30, stories: [{ level: 30, answers: [{ correct: true }] }] },
      { voice: true },
    );
    expect(isSkippedPlacement(real)).toBe(false);
  });

  it('uses a confidence the contract accepts', () => {
    expect(PlacementResult.shape.confidence.options).toContain(PLACEMENT_RULE.skipConfidence);
  });
});

describe('short re-check after a silent placement', () => {
  const silent = finishPlacement(
    {
      startLevel: 30,
      stories: [
        { level: 30, answers: [{ correct: true }, { correct: true }, { correct: false }] },
        { level: 35, answers: [{ correct: true }, { correct: false }, { correct: true }] },
      ],
    },
    { voice: false },
  );

  it('starts at the silent placement estimate, not its already lowered level', () => {
    const state = startRecheck(silent);
    expect(state.stories).toEqual([]);
    expect(state.startLevel).toBe(thetaToLevel(silent.theta));
    expect(state.startLevel).toBeGreaterThanOrEqual(silent.level);
    expect(nextRecheck(state).level).toBe(state.startLevel);
  });

  it('never keeps voice_missing, so a learner whose recordings fail is not locked out', () => {
    const state = startRecheck(silent);
    for (let i = 0; i < PLACEMENT_RULE.recheckStories; i++) {
      state.stories.push({ level: nextRecheck(state).level!, answers: [{ correct: true }] });
    }
    // Every read was skipped: no words-right share at all.
    expect(state.stories.every((s) => s.wordsRightShare === undefined)).toBe(true);
    expect(finishPlacement(state, { voice: true }).flags).toContain('voice_missing');
    expect(finishRecheck(state).flags).not.toContain('voice_missing');
  });

  it('stops after the re-check length', () => {
    const state = startRecheck(silent);
    for (let i = 0; i < PLACEMENT_RULE.recheckStories; i++) {
      const next = nextRecheck(state);
      expect(next.done).toBe(false);
      state.stories.push({ level: next.level!, answers: [{ correct: true }, { correct: false }] });
    }
    expect(nextRecheck(state).done).toBe(true);
  });

  it('can move the level, and clears voice_missing when the learner read aloud', () => {
    const run = (trueLevel: number) => {
      const state = startRecheck(silent);
      for (;;) {
        const next = nextRecheck(state);
        if (next.done || next.level == null) break;
        state.stories.push(simulate(trueLevel, next.level));
      }
      return finishRecheck(state);
    };
    const stronger = run(90);
    const weaker = run(5);
    expect(stronger.level).toBeGreaterThan(silent.level);
    expect(weaker.level).toBeLessThan(silent.level);
    expect(stronger.flags).not.toContain('voice_missing');
  });

  it('is shorter than a full placement on the same stories', () => {
    const state: PlacementState = {
      startLevel: 30,
      stories: Array.from({ length: PLACEMENT_RULE.recheckStories }, () => ({
        level: 30,
        answers: [{ correct: true }, { correct: false }],
      })),
    };
    expect(nextRecheck(state).done).toBe(true);
    expect(nextPlacement(state).done).toBe(false);
  });
});
