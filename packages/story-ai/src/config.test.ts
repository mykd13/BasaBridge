import { describe, expect, it } from 'vitest';
import { loadStoryConfig } from './config';

const KEY = 'gw_secret_key_value_123';

describe('loadStoryConfig', () => {
  it('accepts a valid env', () => {
    const r = loadStoryConfig({ STORY_MODEL: 'google/test-model', AI_GATEWAY_API_KEY: KEY });
    expect(r).toEqual({ ok: true, config: { model: 'google/test-model' } });
  });

  it('fails when the model is missing', () => {
    const r = loadStoryConfig({ AI_GATEWAY_API_KEY: KEY });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe('config');
      expect(r.error.reason).toContain('STORY_MODEL');
      expect(r.error.reason).not.toContain(KEY);
    }
  });

  it('fails when the key is missing', () => {
    const r = loadStoryConfig({ STORY_MODEL: 'google/test-model' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.reason).toContain('AI_GATEWAY_API_KEY');
  });

  it('fails when the model has no provider, without leaking the key', () => {
    const r = loadStoryConfig({ STORY_MODEL: 'test-model', AI_GATEWAY_API_KEY: KEY });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.reason).toContain('provider/model');
      expect(r.error.reason).not.toContain(KEY);
    }
  });
});
