import { describe, expect, it } from 'vitest';
import { canSendLearnerReminder, canSendParentSummary } from './eligibility';

const parent = { optedIn: true, email: 'p@example.test', emailVerified: true };
const activeLink = { status: 'active' as const, sharesProgress: true };
const learner = { ...parent, isUnder13: false };

describe('canSendParentSummary', () => {
  it('sends when opted in, linked and sharing progress', () => {
    expect(canSendParentSummary(parent, activeLink)).toEqual({ ok: true });
  });

  it('does not send without opt-in', () => {
    expect(canSendParentSummary({ ...parent, optedIn: false }, activeLink)).toEqual({
      ok: false,
      reason: 'not_opted_in',
    });
  });

  it('does not send without a verified email', () => {
    expect(canSendParentSummary({ ...parent, emailVerified: false }, activeLink)).toMatchObject({
      reason: 'no_verified_email',
    });
    expect(canSendParentSummary({ ...parent, email: null }, activeLink)).toMatchObject({
      reason: 'no_verified_email',
    });
  });

  it('stops as soon as the link is revoked, pending or gone', () => {
    for (const status of ['revoked', 'pending'] as const) {
      expect(canSendParentSummary(parent, { ...activeLink, status })).toMatchObject({
        reason: 'no_active_link',
      });
    }
    expect(canSendParentSummary(parent, null)).toMatchObject({ reason: 'no_active_link' });
  });

  it('stops when the learner stops sharing progress', () => {
    expect(canSendParentSummary(parent, { ...activeLink, sharesProgress: false })).toMatchObject({
      reason: 'progress_not_shared',
    });
  });
});

describe('canSendLearnerReminder', () => {
  it('sends to an opted-in learner aged 13 or older', () => {
    expect(canSendLearnerReminder(learner)).toEqual({ ok: true });
  });

  it('never sends to an under-13 learner, even when opted in', () => {
    expect(canSendLearnerReminder({ ...learner, isUnder13: true })).toEqual({
      ok: false,
      reason: 'learner_under_13',
    });
  });

  it('does not send without opt-in or a verified email', () => {
    expect(canSendLearnerReminder({ ...learner, optedIn: false })).toMatchObject({
      reason: 'not_opted_in',
    });
    expect(canSendLearnerReminder({ ...learner, email: null })).toMatchObject({
      reason: 'no_verified_email',
    });
  });
});
