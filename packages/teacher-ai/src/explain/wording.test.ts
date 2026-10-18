import { describe, expect, it } from 'vitest';
import { SURENESS_LINES } from './sureness';
import type { PatternFacts } from './types';
import { pickExample, standardChildLine, standardExplanation, standardParentLine } from './wording';

const ending: PatternFacts = {
  kind: 'dropped_ending',
  key: 'ing',
  count: 5,
  opportunities: 8,
  confidence: 'high',
  examples: [
    { expected: 'jumping', heard: 'jumping' },
    { expected: 'running', heard: 'run' },
  ],
};

const swap: PatternFacts = {
  kind: 'repeated_substitution',
  key: 'was>saw',
  count: 2,
  opportunities: 6,
  confidence: 'medium',
  examples: [{ expected: 'was', heard: 'saw' }],
};

const pause: PatternFacts = {
  kind: 'missing_pause',
  key: 'full_stop',
  count: 3,
  opportunities: 9,
  confidence: 'low',
  examples: [{ expected: 'home', heard: 'home' }],
};

describe('pickExample', () => {
  it('prefers an example the child said differently', () => {
    expect(pickExample(ending)).toEqual({ expected: 'running', heard: 'run' });
  });

  it('falls back to the first example, or null when there are none', () => {
    expect(pickExample(pause)).toEqual({ expected: 'home', heard: 'home' });
    expect(pickExample({ ...pause, examples: [] })).toBeNull();
  });
});

describe('standard lines', () => {
  it('states a high pattern with an example and no numbers for the child', () => {
    expect(standardChildLine(ending, 'state')).toBe(
      'You often leave the “-ing” off words. You said “run” for “running”. Say the whole word, right to the end.',
    );
  });

  it('gives the parent the example and the counts', () => {
    expect(standardParentLine(ending, 'state')).toBe(
      'Your child often left off the “-ing” ending, for example reading “running” as “run”. This happened 5 of the 8 times a word ended in “-ing”.',
    );
  });

  it('says a medium pattern as a possibility', () => {
    expect(standardChildLine(swap, 'possible')).toBe(
      'You might be mixing up “was” and “saw”. Point to the word and say it slowly.',
    );
    expect(standardParentLine(swap, 'possible')).toBe(
      'Your child may be mixing up “was” and “saw”. This happened 2 of the 6 times “was” came up.',
    );
  });

  it('reads a substitution from its key when there is no example', () => {
    expect(standardChildLine({ ...swap, examples: [] }, 'state')).toBe(
      'You often say “saw” when the word is “was”. Point to the word and say it slowly.',
    );
  });

  it('uses the canvas wording for missing pauses', () => {
    expect(standardChildLine(pause, 'state')).toBe(
      'You did not stop at the full stops. Take a small breath at each one.',
    );
  });
});

describe('standardExplanation', () => {
  it('leaves out low patterns and ends each note with how sure it is', () => {
    const notes = standardExplanation([ending, swap, pause]);
    expect(notes.child).toContain('“-ing”');
    expect(notes.child).toContain('mixing up');
    expect(notes.child).not.toContain('full stop');
    expect(notes.parent).not.toContain('full stop');
    // One medium pattern makes the whole note a guess.
    expect(notes.child.endsWith(SURENESS_LINES.child.medium)).toBe(true);
    expect(notes.parent.endsWith(SURENESS_LINES.parent.medium)).toBe(true);
  });

  it('says nothing was clear when every pattern is low', () => {
    expect(standardExplanation([pause])).toEqual({
      child: SURENESS_LINES.child.none,
      parent: SURENESS_LINES.parent.none,
    });
    expect(standardExplanation([])).toEqual({
      child: SURENESS_LINES.child.none,
      parent: SURENESS_LINES.parent.none,
    });
  });
});
