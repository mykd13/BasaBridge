import { describe, expect, it } from 'vitest';
import {
  assertModelRoles,
  DEFAULT_MODEL_TIMEOUT_MS,
  loadModelRoles,
  ModelConfigError,
} from './roles';

const env = (over: Record<string, string | undefined> = {}) => ({
  STORY_MODEL: 'google/story-a',
  STORY_FALLBACK_MODEL: 'google/story-b',
  VERIFIER_MODEL: 'google/verify-a',
  VERIFIER_FALLBACK_MODEL: 'google/verify-b',
  NOTES_MODEL: 'google/notes-a',
  NOTES_FALLBACK_MODEL: 'google/notes-b',
  ...over,
});

const reasons = (e: Record<string, string | undefined>) => {
  const r = loadModelRoles(e);
  return r.ok ? [] : r.reasons;
};

describe('loadModelRoles', () => {
  it('reads every role with its fallback and the default timeout', () => {
    const r = loadModelRoles(env());
    expect(r).toEqual({
      ok: true,
      config: {
        roles: {
          story: { primary: 'google/story-a', fallback: 'google/story-b' },
          verifier: { primary: 'google/verify-a', fallback: 'google/verify-b' },
          notes: { primary: 'google/notes-a', fallback: 'google/notes-b' },
        },
        timeoutMs: DEFAULT_MODEL_TIMEOUT_MS,
      },
    });
  });

  it('requires a fallback for each role', () => {
    expect(reasons(env({ STORY_FALLBACK_MODEL: undefined }))).toEqual([
      'STORY_FALLBACK_MODEL is not set.',
    ]);
    expect(reasons(env({ NOTES_FALLBACK_MODEL: '  ' }))).toEqual([
      'NOTES_FALLBACK_MODEL is not set.',
    ]);
  });

  it('rejects malformed names without repeating the value', () => {
    const r = reasons(env({ VERIFIER_MODEL: 'secret-looking-value' }));
    expect(r).toEqual(['VERIFIER_MODEL must look like provider/model.']);
    expect(r.join(' ')).not.toContain('secret-looking-value');
  });

  it('rejects a fallback that equals its primary', () => {
    expect(reasons(env({ NOTES_FALLBACK_MODEL: 'google/Notes-A' }))).toEqual([
      'NOTES_FALLBACK_MODEL must be a different model from NOTES_MODEL.',
    ]);
  });

  it('never lets the verifier equal the story model', () => {
    expect(reasons(env({ VERIFIER_MODEL: 'google/story-a' }))).toEqual([
      'VERIFIER_MODEL must be a different model from STORY_MODEL.',
    ]);
  });

  it('checks the fallbacks too, so a swap cannot break the rule', () => {
    expect(reasons(env({ VERIFIER_FALLBACK_MODEL: 'google/story-a' }))).toEqual([
      'VERIFIER_FALLBACK_MODEL must be a different model from STORY_MODEL.',
    ]);
    expect(reasons(env({ VERIFIER_MODEL: 'google/story-b' }))).toEqual([
      'VERIFIER_MODEL must be a different model from STORY_FALLBACK_MODEL.',
    ]);
  });

  it('allows the notes model to match a story model', () => {
    expect(reasons(env({ NOTES_MODEL: 'google/story-a' }))).toEqual([]);
  });

  it('reads MODEL_TIMEOUT_MS and rejects bad values', () => {
    const r = loadModelRoles(env({ MODEL_TIMEOUT_MS: '15000' }));
    expect(r.ok && r.config.timeoutMs).toBe(15000);
    expect(reasons(env({ MODEL_TIMEOUT_MS: '0' }))).toEqual([
      'MODEL_TIMEOUT_MS must be a whole number of milliseconds above 0.',
    ]);
    expect(reasons(env({ MODEL_TIMEOUT_MS: 'soon' }))).toHaveLength(1);
  });

  it('lists every problem at once', () => {
    expect(reasons({})).toHaveLength(6);
  });
});

describe('assertModelRoles', () => {
  it('returns the config when it is valid', () => {
    expect(assertModelRoles(env()).roles.story.primary).toBe('google/story-a');
  });

  it('throws at startup when the verifier equals the generator', () => {
    const bad = env({ VERIFIER_MODEL: 'google/story-a' });
    expect(() => assertModelRoles(bad)).toThrow(ModelConfigError);
    expect(() => assertModelRoles(bad)).toThrow(/VERIFIER_MODEL must be a different model/);
  });
});
