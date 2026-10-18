import { describe, expect, it } from 'vitest';
import { PLACEMENT_RULE } from '@basabridge/levels';
import {
  nextPlacement,
  pickPlacementStory,
  recordPlacementStory,
  startPlacement,
  type PlacementBankStory,
  type PlacementSession,
} from './placement';

/** Stand-in for the placement bank (BB-48): stories at steps of five levels, two per level. */
const bank: PlacementBankStory[] = Array.from({ length: 20 }, (_, i) => (i + 1) * 5).flatMap(
  (level) => [
    { id: `L${level}a`, level },
    { id: `L${level}b`, level },
  ],
);

describe('pickPlacementStory', () => {
  it('picks a story at the start level', () => {
    const s = startPlacement({ grade: 3, voice: true });
    const story = pickPlacementStory(bank, s);
    expect(story?.level).toBe(nextPlacement(s).level);
  });

  it('picks the nearest level when the bank has no exact match, easier on a tie', () => {
    // Grade 4 starts at 42. Nearest bank levels are 40 and 45.
    const s = startPlacement({ grade: 4, voice: true });
    expect(nextPlacement(s).level).toBe(42);
    expect(pickPlacementStory(bank, s)?.level).toBe(40);
    const tie: PlacementSession = { ...s, startLevel: 42 };
    const evenBank = [
      { id: 'x', level: 44 },
      { id: 'y', level: 40 },
    ];
    expect(pickPlacementStory(evenBank, tie)?.id).toBe('y');
  });

  it('never picks a story the learner has read', () => {
    let s = startPlacement({ grade: 3, voice: true });
    const first = pickPlacementStory(bank, s)!;
    s = recordPlacementStory(s, {
      storyId: first.id,
      level: first.level,
      answers: [{ correct: true }, { correct: false }],
    });
    const seenIds = s.stories.map((x) => x.storyId);
    for (let i = 0; i < 3 && !nextPlacement(s).done; i++) {
      const story = pickPlacementStory(bank, s)!;
      expect(seenIds).not.toContain(story.id);
      seenIds.push(story.id);
      s = recordPlacementStory(s, {
        storyId: story.id,
        level: story.level,
        answers: [{ correct: true }, { correct: false }],
      });
    }
  });

  it('stays within the maximum step of the last story', () => {
    const s = startPlacement({ grade: 1, voice: true });
    const farOnly = [{ id: 'far', level: s.startLevel + PLACEMENT_RULE.maxStep + 5 }];
    expect(pickPlacementStory(farOnly, s)).toBeNull();
  });

  it('returns null once the placement is done', () => {
    let s = startPlacement({ grade: 3, voice: true });
    while (!nextPlacement(s).done) {
      const story = pickPlacementStory(bank, s)!;
      s = recordPlacementStory(s, {
        storyId: story.id,
        level: story.level,
        answers: [{ correct: true }, { correct: true }, { correct: false }],
      });
    }
    expect(pickPlacementStory(bank, s)).toBeNull();
  });

  it('returns null for an empty bank', () => {
    expect(pickPlacementStory([], startPlacement({ grade: 3, voice: true }))).toBeNull();
  });

  it('keeps the story type the caller passed in', () => {
    const rich = [{ id: 'a', level: 30, title: 'kept' }];
    expect(pickPlacementStory(rich, startPlacement({ grade: 3, voice: true }))?.title).toBe('kept');
  });
});
