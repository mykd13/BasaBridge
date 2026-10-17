import { describe, expect, it } from 'vitest';
import type { WordResult } from '@basabridge/contracts';
import { placementReadOutcome, PLACEMENT_READ_RETRIES } from './placement';
import { summariseTry } from './index';

const w = (outcome: WordResult['outcome']): WordResult => ({
  expected: 'a',
  heard: outcome === 'omission' ? null : 'a',
  outcome,
  confidence: 0.9,
  markedMisheard: false,
});

describe('placementReadOutcome', () => {
  it('passes the words-right share on a good read', () => {
    const analysis = summariseTry([w('correct'), w('correct'), w('substitution'), w('correct')], 4);
    expect(placementReadOutcome({ ok: true, analysis }, 0)).toEqual({
      status: 'scored',
      wordsRightShare: 0.75,
    });
  });

  it('scores an incomplete read by what was read, not as a failure', () => {
    const analysis = summariseTry([w('correct'), w('correct'), w('omission'), w('omission')], 4);
    expect(placementReadOutcome({ ok: true, analysis }, 0)).toEqual({
      status: 'scored',
      wordsRightShare: 0.5,
    });
  });

  it('retries a failed recording first', () => {
    expect(placementReadOutcome({ ok: false }, 1)).toEqual({ status: 'retry' });
  });

  it('skips after the retries are used, never scoring zero', () => {
    const out = placementReadOutcome({ ok: false }, PLACEMENT_READ_RETRIES + 1);
    expect(out).toEqual({ status: 'skipped' });
    expect('wordsRightShare' in out).toBe(false);
  });

  it('treats an analysis with no words as a failed recording', () => {
    const analysis = summariseTry([], 3);
    expect(placementReadOutcome({ ok: true, analysis }, 1)).toEqual({ status: 'retry' });
  });
});
