import { describe, expect, it } from 'vitest';
import { LISTEN_THEN_READ, isSupportedTry, listenThenReadAllowed, wordsRightLabel } from './listen';

const base = { level: 5, inPlacement: false, enabled: true };

describe('listenThenReadAllowed', () => {
  it('is offered at levels 1 to 10', () => {
    expect(listenThenReadAllowed({ ...base, level: 1 })).toBe(true);
    expect(listenThenReadAllowed({ ...base, level: LISTEN_THEN_READ.maxLevel })).toBe(true);
  });

  it('is never offered above level 10', () => {
    expect(listenThenReadAllowed({ ...base, level: LISTEN_THEN_READ.maxLevel + 1 })).toBe(false);
    expect(listenThenReadAllowed({ ...base, level: 60 })).toBe(false);
  });

  it('is never offered in placement', () => {
    expect(listenThenReadAllowed({ ...base, inPlacement: true })).toBe(false);
  });

  it('is off when the learner turned it off', () => {
    expect(listenThenReadAllowed({ ...base, enabled: false })).toBe(false);
  });
});

describe('isSupportedTry', () => {
  it('is supported when allowed and the learner listened', () => {
    expect(isSupportedTry({ ...base, listened: true })).toBe(true);
  });

  it('is a normal try when the learner skipped the audio', () => {
    expect(isSupportedTry({ ...base, listened: false })).toBe(false);
  });

  it('is a normal try when the setting is off, even if audio played', () => {
    expect(isSupportedTry({ ...base, enabled: false, listened: true })).toBe(false);
  });

  it('is a normal try in placement or above level 10', () => {
    expect(isSupportedTry({ ...base, inPlacement: true, listened: true })).toBe(false);
    expect(isSupportedTry({ ...base, level: 11, listened: true })).toBe(false);
  });
});

describe('wordsRightLabel', () => {
  it('labels only supported tries', () => {
    expect(wordsRightLabel(true)).toBe('after_listening');
    expect(wordsRightLabel(false)).toBeNull();
  });
});
