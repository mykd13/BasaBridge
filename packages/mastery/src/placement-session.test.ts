import { describe, expect, it } from 'vitest';
import { PLACEMENT_RULE } from '@basabridge/levels';
import {
  finishPlacementSession,
  nextPlacement,
  parsePlacementProgress,
  PlacementError,
  placementProgress,
  recordPlacementStory,
  startLevelForGrade,
  startPlacement,
  type PlacementSession,
  type PlacementStoryRead,
} from './placement';

const allRight = (n = 5) => Array.from({ length: n }, () => ({ correct: true }));
const mixed = () => [{ correct: true }, { correct: false }, { correct: true }, { correct: false }];

function read(storyId: string, level: number, answers = mixed()): PlacementStoryRead {
  return { storyId, level, answers, wordsRightShare: 0.95 };
}

/** Read stories at whatever level the engine asks for until it is done. */
function readToEnd(session: PlacementSession): PlacementSession {
  let s = session;
  for (let i = 0; i < 10; i++) {
    const next = nextPlacement(s);
    if (next.done) return s;
    s = recordPlacementStory(s, read(`s${i}`, next.level!));
  }
  throw new Error('placement did not stop');
}

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    if (e instanceof PlacementError) return e.code;
    throw e;
  }
  return undefined;
}

describe('placement session lifecycle', () => {
  it('starts at the grade level with no stories', () => {
    const s = startPlacement({ grade: 3, voice: true });
    expect(s).toEqual({
      kind: 'full',
      voice: true,
      startLevel: startLevelForGrade(3),
      stories: [],
    });
    expect(nextPlacement(s).level).toBe(startLevelForGrade(3));
  });

  it('records stories without changing the session it was given', () => {
    const s0 = startPlacement({ grade: 3, voice: true });
    const s1 = recordPlacementStory(s0, read('a', s0.startLevel));
    expect(s0.stories).toHaveLength(0);
    expect(s1.stories).toHaveLength(1);
  });

  it('finishes with a result once the engine says it is done', () => {
    const done = readToEnd(startPlacement({ grade: 4, voice: true }));
    expect(done.stories.length).toBeGreaterThanOrEqual(PLACEMENT_RULE.minStories);
    expect(done.stories.length).toBeLessThanOrEqual(PLACEMENT_RULE.maxStories);
    const result = finishPlacementSession(done);
    expect(result.storiesRead).toBe(done.stories.length);
    expect(result.flags).not.toContain('voice_missing');
  });

  it('does not finish early', () => {
    const s = startPlacement({ grade: 4, voice: true });
    expect(codeOf(() => finishPlacementSession(s))).toBe('not_done');
  });

  it('gives each story one try', () => {
    const s = recordPlacementStory(startPlacement({ grade: 3, voice: true }), read('a', 30));
    expect(codeOf(() => recordPlacementStory(s, read('a', 30)))).toBe('already_read');
  });

  it('rejects a story more than the maximum step from the last one', () => {
    const s = startPlacement({ grade: 3, voice: true });
    const far = s.startLevel + PLACEMENT_RULE.maxStep + 1;
    expect(codeOf(() => recordPlacementStory(s, read('a', far)))).toBe('too_far');
    const edge = s.startLevel + PLACEMENT_RULE.maxStep;
    expect(codeOf(() => recordPlacementStory(s, read('a', edge)))).toBeUndefined();
  });

  it('rejects stories after the placement is done', () => {
    const done = readToEnd(startPlacement({ grade: 4, voice: true }));
    expect(codeOf(() => recordPlacementStory(done, read('extra', 40)))).toBe('done');
  });

  it('flags a silent placement and caps its confidence', () => {
    let s = startPlacement({ grade: 4, voice: false });
    for (let i = 0; !nextPlacement(s).done; i++) {
      s = recordPlacementStory(s, {
        storyId: `s${i}`,
        level: nextPlacement(s).level!,
        answers: allRight(),
      });
    }
    const result = finishPlacementSession(s);
    expect(result.flags).toContain('voice_missing');
    expect(['none', 'early']).toContain(result.confidence);
  });
});

describe('pause and resume', () => {
  it('resumes from stored progress and reaches the same result', () => {
    const s0 = startPlacement({ grade: 5, voice: true });
    const s1 = recordPlacementStory(s0, read('a', nextPlacement(s0).level!, allRight()));
    // Pause: store as JSON, the way a jsonb column round-trips it.
    const stored = JSON.parse(JSON.stringify(placementProgress(s1))) as unknown;
    const resumed = parsePlacementProgress(stored);
    expect(resumed).toEqual(s1);
    expect(nextPlacement(resumed!)).toEqual(nextPlacement(s1));
    expect(finishPlacementSession(readToEnd(resumed!))).toEqual(
      finishPlacementSession(readToEnd(s1)),
    );
  });

  it('keeps answer details through a round trip', () => {
    const s = recordPlacementStory(startPlacement({ grade: 2, voice: true }), {
      storyId: 'a',
      level: 20,
      wordsRightShare: 0.8,
      answers: [
        { correct: true, subskill: 'key_detail', type: 'multiple_choice' },
        { correct: false, subskill: 'sequence', type: 'order_events', weight: 0.3 },
      ],
    });
    expect(parsePlacementProgress(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('does not share state with the stored copy', () => {
    const s = recordPlacementStory(startPlacement({ grade: 2, voice: true }), read('a', 20));
    const stored = placementProgress(s);
    stored.stories.push(read('b', 20));
    expect(s.stories).toHaveLength(1);
  });

  it.each([
    ['not an object', 'x'],
    ['empty object', {}],
    ['unknown kind', { kind: 'other', voice: true, startLevel: 30, stories: [] }],
    ['level out of range', { kind: 'full', voice: true, startLevel: 0, stories: [] }],
    ['level not whole', { kind: 'full', voice: true, startLevel: 30.5, stories: [] }],
    ['voice missing', { kind: 'full', startLevel: 30, stories: [] }],
    [
      'story with no id',
      { kind: 'full', voice: true, startLevel: 30, stories: [{ level: 30, answers: [] }] },
    ],
    [
      'answer with no result',
      {
        kind: 'full',
        voice: true,
        startLevel: 30,
        stories: [{ storyId: 'a', level: 30, answers: [{}] }],
      },
    ],
    [
      'unknown sub-skill',
      {
        kind: 'full',
        voice: true,
        startLevel: 30,
        stories: [{ storyId: 'a', level: 30, answers: [{ correct: true, subskill: 'spelling' }] }],
      },
    ],
    [
      'share above one',
      {
        kind: 'full',
        voice: true,
        startLevel: 30,
        stories: [{ storyId: 'a', level: 30, wordsRightShare: 1.2, answers: [] }],
      },
    ],
    [
      'same story twice',
      {
        kind: 'full',
        voice: true,
        startLevel: 30,
        stories: [
          { storyId: 'a', level: 30, answers: [] },
          { storyId: 'a', level: 30, answers: [] },
        ],
      },
    ],
    [
      'more stories than a re-check allows',
      {
        kind: 'recheck',
        voice: true,
        startLevel: 30,
        stories: [
          { storyId: 'a', level: 30, answers: [] },
          { storyId: 'b', level: 30, answers: [] },
          { storyId: 'c', level: 30, answers: [] },
        ],
      },
    ],
  ])('refuses damaged progress: %s', (_, value) => {
    expect(parsePlacementProgress(value)).toBeNull();
  });
});
