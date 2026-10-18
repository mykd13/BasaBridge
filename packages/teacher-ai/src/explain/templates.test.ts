/**
 * The standard wording is the fallback for a model reply that fails the claim checks, so it must
 * pass those same checks itself, for every pattern kind, phrasing and kind of example.
 */
import { describe, expect, it } from 'vitest';
import { allowedQuotes, childHasNumber, missingHedge, overclaims, unknownWords } from './claims';
import type { PatternFacts, PatternKind, WordPair } from './types';
import { standardChildLine, standardExplanation, standardParentLine } from './wording';

const KEYS: Record<PatternKind, string[]> = {
  dropped_ending: ['ing', 's', 'ed'],
  letter_pattern: ['th', 'ch'],
  repeated_substitution: ['was>saw', 'then>than'],
  missing_pause: ['full_stop'],
};

function exampleSets(kind: PatternKind, key: string): WordPair[][] {
  const [expected, heard] =
    kind === 'dropped_ending'
      ? [`walk${key}`, 'walk']
      : kind === 'letter_pattern'
        ? [`${key}ink`, 'tink']
        : kind === 'repeated_substitution'
          ? key.split('>')
          : ['home', 'home'];
  return [
    [{ expected: expected!, heard: heard! }],
    [{ expected: expected!, heard: expected! }],
    [{ expected: expected!, heard: null }],
    [],
  ];
}

const COUNTS = [
  { count: 2, opportunities: 10 },
  { count: 12, opportunities: 15 },
];

const cases: { p: PatternFacts; said: 'possible' | 'state' }[] = [];
for (const kind of Object.keys(KEYS) as PatternKind[]) {
  for (const key of KEYS[kind]) {
    for (const examples of exampleSets(kind, key)) {
      for (const counts of COUNTS) {
        cases.push({
          p: { kind, key, ...counts, confidence: 'medium', examples },
          said: 'possible',
        });
        cases.push({ p: { kind, key, ...counts, confidence: 'high', examples }, said: 'state' });
      }
    }
  }
}

describe('standard wording passes the claim checks', () => {
  it.each(cases.map((c) => [`${c.p.kind} ${c.p.key} ${c.said} (${c.p.examples.length} ex)`, c]))(
    '%s',
    (_, { p, said }) => {
      const allowed = allowedQuotes([p]);
      const child = standardChildLine(p, said);
      const parent = standardParentLine(p, said);

      expect(childHasNumber(child)).toBe(false);
      for (const line of [child, parent]) {
        expect(overclaims(line, said)).toEqual([]);
        expect(unknownWords(line, allowed)).toEqual([]);
        if (said === 'possible') expect(missingHedge(line)).toBe(false);
      }
      // Built from the counts, so a parent can read it as a rate.
      expect(parent).toContain(`${p.count} of the ${p.opportunities} times`);
    },
  );

  it('keeps whole notes free of numbers for the child and of made-up words', () => {
    const all = cases.map((c) => c.p);
    for (let i = 0; i < all.length; i += 3) {
      const group = all.slice(i, i + 3);
      const notes = standardExplanation(group);
      const allowed = allowedQuotes(group);
      expect(childHasNumber(notes.child)).toBe(false);
      expect(unknownWords(notes.child, allowed)).toEqual([]);
      expect(unknownWords(notes.parent, allowed)).toEqual([]);
    }
  });
});
