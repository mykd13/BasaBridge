import { describe, expect, it } from 'vitest';
import { entries, flatten, messagesFor, pick } from './messages.ts';
import type { Catalog } from './types.ts';

const sample = {
  a: { standard: 'Standard A', simple: 'Simple A' },
  group: { b: { standard: 'Standard B' } },
} as const satisfies Catalog;

describe('flatten', () => {
  it('uses the simple wording when there is one', () => {
    expect(flatten(sample, 'simple')).toEqual({ a: 'Simple A', group: { b: 'Standard B' } });
  });

  it('falls back to standard when a key has no simple wording', () => {
    expect(flatten(sample, 'simple').group.b).toBe('Standard B');
    expect(pick({ standard: 'Only' }, 'simple')).toBe('Only');
  });

  it('uses standard when asked for standard', () => {
    expect(flatten(sample, 'standard')).toEqual({ a: 'Standard A', group: { b: 'Standard B' } });
  });
});

describe('entries', () => {
  it('lists dotted keys in order', () => {
    expect(entries(sample).map((e) => e.key)).toEqual(['a', 'group.b']);
  });
});

describe('messagesFor', () => {
  it('returns real Filipino simple wording', () => {
    expect(messagesFor('fil', 'simple').app.tagline).toBe('Magbasa nang malakas.');
    expect(messagesFor('en', 'standard').app.tagline).toBe('Read out loud. Understand more.');
  });
});
