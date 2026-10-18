import { READING_HELP_PRESETS } from '@basabridge/contracts';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STATE,
  activeAccommodations,
  applyPreset,
  applyToRoot,
  loadState,
  matchingPreset,
  saveState,
  storageKey,
  toRootAttributes,
  toSharedSettings,
} from './settings';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe('presets', () => {
  it('starts on the standard preset', () => {
    expect(matchingPreset(DEFAULT_STATE)).toBe('standard');
  });

  it('applies more help from the contract preset', () => {
    const next = applyPreset(DEFAULT_STATE, 'more');
    expect(next).toMatchObject({
      textSize: 'large',
      lineSpacing: 'wide',
      readingRuler: true,
      simpleWords: true,
      audioInstructions: true,
      questionReadAloud: true,
    });
    expect(matchingPreset(next)).toBe('more');
  });

  it('keeps language, listen then read and contrast when a preset is chosen', () => {
    const mine = {
      ...DEFAULT_STATE,
      language: 'fil' as const,
      listenThenRead: false,
      highContrast: true,
    };
    const next = applyPreset(mine, 'more');
    expect(next.language).toBe('fil');
    expect(next.listenThenRead).toBe(false);
    expect(next.highContrast).toBe(true);
    expect(applyPreset(next, 'standard')).toMatchObject({ language: 'fil', textSize: 'medium' });
  });

  it('matches no preset once one control changes', () => {
    expect(
      matchingPreset({ ...applyPreset(DEFAULT_STATE, 'more'), textSize: 'medium' }),
    ).toBeNull();
  });

  it('ignores language when matching', () => {
    expect(matchingPreset({ ...DEFAULT_STATE, language: 'fil' })).toBe('standard');
    expect(READING_HELP_PRESETS.standard.language).toBe('en');
  });
});

describe('settings mapping', () => {
  it('maps text size, spacing and contrast to root attributes', () => {
    expect(
      toRootAttributes({
        ...DEFAULT_STATE,
        textSize: 'large',
        lineSpacing: 'wide',
        highContrast: true,
      }),
    ).toEqual({
      'data-text-size': 'large',
      'data-line-spacing': 'wide',
      'data-contrast': 'more',
    });
    expect(toRootAttributes(DEFAULT_STATE)['data-contrast']).toBeNull();
  });

  it('sets and clears attributes on the element', () => {
    const attrs = new Map<string, string>();
    const el = {
      setAttribute: (k: string, v: string) => void attrs.set(k, v),
      removeAttribute: (k: string) => void attrs.delete(k),
    };
    applyToRoot(el, { ...DEFAULT_STATE, textSize: 'small', highContrast: true });
    expect(attrs.get('data-text-size')).toBe('small');
    expect(attrs.get('data-contrast')).toBe('more');
    applyToRoot(el, DEFAULT_STATE);
    expect(attrs.has('data-contrast')).toBe(false);
    expect(attrs.get('data-line-spacing')).toBe('normal');
  });
});

describe('shared settings', () => {
  it('leaves the device-only field out', () => {
    expect(toSharedSettings({ ...DEFAULT_STATE, highContrast: true })).not.toHaveProperty(
      'highContrast',
    );
  });
});

describe('accommodations (rule 12)', () => {
  it('reports question read-aloud only when it is on', () => {
    expect(activeAccommodations(DEFAULT_STATE)).toEqual([]);
    expect(activeAccommodations({ ...DEFAULT_STATE, questionReadAloud: true })).toEqual([
      'question_read_aloud',
    ]);
  });
});

describe('per-device copy', () => {
  it('round trips per learner', () => {
    const storage = memoryStorage();
    const mine = applyPreset(DEFAULT_STATE, 'more');
    expect(saveState(storage, 'a', { ...mine, highContrast: true })).toBe(true);
    expect(loadState(storage, 'a')).toEqual({ ...mine, highContrast: true });
    expect(loadState(storage, 'b')).toBeNull();
    expect(storageKey('a')).not.toBe(storageKey('b'));
  });

  it('returns null for damaged or invalid data', () => {
    expect(loadState(memoryStorage({ [storageKey('a')]: '{nope' }), 'a')).toBeNull();
    expect(loadState(memoryStorage({ [storageKey('a')]: '{"textSize":"huge"}' }), 'a')).toBeNull();
  });

  it('survives blocked storage', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadState(blocked, 'a')).toBeNull();
    expect(saveState(blocked, 'a', DEFAULT_STATE)).toBe(false);
  });
});
