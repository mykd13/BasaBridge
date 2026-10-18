import { describe, expect, it } from 'vitest';
import { thetaToLevel } from './ability';
import { PlacementResult } from '@basabridge/contracts';
import { PLACEMENT_RULE } from '@basabridge/levels';
import {
  canRetakePlacement,
  finishPlacementSession,
  needsVoiceRecheck,
  nextForSession,
  nextPlacement,
  parsePlacementProgress,
  recordPlacementStory,
  retakeAvailableAt,
  skipPlacement,
  startLevelForGrade,
  startPlacement,
  startRecheckSession,
  type PlacementSession,
} from './placement';

const DAY = 24 * 60 * 60 * 1000;

function silentPlacement(): PlacementResult {
  let s: PlacementSession = startPlacement({ grade: 4, voice: false });
  for (let i = 0; !nextPlacement(s).done; i++) {
    s = recordPlacementStory(s, {
      storyId: `s${i}`,
      level: nextPlacement(s).level!,
      answers: [{ correct: true }, { correct: true }, { correct: false }, { correct: true }],
    });
  }
  return finishPlacementSession(s);
}

describe('retake', () => {
  const finished = new Date('2026-10-01T08:00:00Z');

  it('allows a first placement at any time', () => {
    expect(canRetakePlacement(null, finished)).toBe(true);
  });

  it('waits the full number of days', () => {
    const days = PLACEMENT_RULE.retakeAfterDays;
    expect(retakeAvailableAt(finished).getTime() - finished.getTime()).toBe(days * DAY);
    expect(canRetakePlacement(finished, new Date(finished.getTime() + days * DAY - 1))).toBe(false);
    expect(canRetakePlacement(finished, new Date(finished.getTime() + days * DAY))).toBe(true);
  });

  it('does not allow a retake the next day', () => {
    expect(canRetakePlacement(finished, new Date(finished.getTime() + DAY))).toBe(false);
  });
});

describe('skipped placement', () => {
  it('starts at the grade default with no confidence', () => {
    const r = skipPlacement(3);
    expect(PlacementResult.safeParse(r).success).toBe(true);
    expect(r.level).toBe(startLevelForGrade(3));
    expect(r.confidence).toBe('none');
    expect(r.storiesRead).toBe(0);
    expect(r.flags).toEqual([]);
  });

  it('uses the default start without a grade', () => {
    expect(skipPlacement(null).level).toBe(PLACEMENT_RULE.defaultStart);
  });

  it('does not ask for a voice re-check, since there is nothing to re-check', () => {
    expect(needsVoiceRecheck(skipPlacement(3), true)).toBe(false);
  });
});

describe('voice re-check', () => {
  it('is due only for a silent placement once voice is approved', () => {
    const silent = silentPlacement();
    expect(silent.flags).toContain('voice_missing');
    expect(needsVoiceRecheck(silent, false)).toBe(false);
    expect(needsVoiceRecheck(silent, true)).toBe(true);
    expect(needsVoiceRecheck({ ...silent, flags: [] }, true)).toBe(false);
  });

  it('is short, uses voice and starts from the earlier estimate', () => {
    const silent = silentPlacement();
    const s = startRecheckSession(silent);
    expect(s.kind).toBe('recheck');
    expect(s.voice).toBe(true);
    expect(s.startLevel).toBe(thetaToLevel(silent.theta));
    expect(nextForSession(s).level).toBe(s.startLevel);
  });

  it('stops after the re-check length and clears the voice flag', () => {
    const silent = silentPlacement();
    let s = startRecheckSession(silent);
    let count = 0;
    while (!nextForSession(s).done) {
      s = recordPlacementStory(s, {
        storyId: `r${count}`,
        level: nextForSession(s).level!,
        wordsRightShare: 0.95,
        answers: [{ correct: true }, { correct: false }, { correct: true }, { correct: true }],
      });
      count++;
    }
    expect(count).toBe(PLACEMENT_RULE.recheckStories);
    const r = finishPlacementSession(s);
    expect(r.flags).not.toContain('voice_missing');
    expect(r.storiesRead).toBe(count);
    expect(PlacementResult.safeParse(r).success).toBe(true);
  });

  it('survives a pause', () => {
    const s = startRecheckSession(silentPlacement());
    expect(parsePlacementProgress(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});
