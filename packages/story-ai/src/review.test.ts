import { describe, expect, it } from 'vitest';
import {
  REPORT_REASONS,
  REVIEW_CHECKLIST,
  checkReviewDecision,
  type ReviewDecision,
} from './review';

describe('report reasons', () => {
  it('are codes with no free text option', () => {
    for (const r of REPORT_REASONS) expect(r).toMatch(/^[a-z_]+$/);
  });
});

describe('checkReviewDecision', () => {
  it('accepts an approval with nothing failed', () => {
    expect(checkReviewDecision({ action: 'approve', failed: [] })).toEqual({ ok: true });
  });

  it('accepts fix and retire with a reason', () => {
    expect(checkReviewDecision({ action: 'fix', failed: ['clear_wording'] }).ok).toBe(true);
    expect(checkReviewDecision({ action: 'retire', failed: ['child_safe', 'level_fit'] }).ok).toBe(
      true,
    );
  });

  it('rejects an approval with failed items', () => {
    expect(checkReviewDecision({ action: 'approve', failed: ['level_fit'] }).ok).toBe(false);
  });

  it('rejects fix or retire with no failed item', () => {
    expect(checkReviewDecision({ action: 'fix', failed: [] }).ok).toBe(false);
    expect(checkReviewDecision({ action: 'retire', failed: [] }).ok).toBe(false);
  });

  it('rejects unknown actions, unknown items and duplicates', () => {
    expect(
      checkReviewDecision({ action: 'delete', failed: [] } as unknown as ReviewDecision).ok,
    ).toBe(false);
    expect(
      checkReviewDecision({ action: 'fix', failed: ['typo'] } as unknown as ReviewDecision).ok,
    ).toBe(false);
    expect(checkReviewDecision({ action: 'fix', failed: ['level_fit', 'level_fit'] }).ok).toBe(
      false,
    );
  });

  it('knows every checklist item', () => {
    for (const c of REVIEW_CHECKLIST) {
      expect(checkReviewDecision({ action: 'fix', failed: [c.id] }).ok).toBe(true);
    }
  });
});
