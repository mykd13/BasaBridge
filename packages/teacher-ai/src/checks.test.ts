import { describe, expect, it } from 'vitest';
import { checkNotes, toneProblems } from './checks';
import { type ModelNotes, NotesInput } from './schema';
import {
  STANDARD_ACTIVITIES,
  standardChildMessage,
  standardWhatHappened,
  standardWhyFocus,
} from './standard';

const facts = NotesInput.parse({
  levelBefore: 12,
  levelAfter: 12,
  passed: false,
  correct: 3,
  total: 5,
  wordsRight: 40,
  wordsTotal: 44,
  missed: [{ skill: 'inferential' }, { skill: 'inferential' }],
  focus: 'inferential',
});

const good: ModelNotes = {
  childMessage: 'You read the whole story out loud. Next time, look for clues between the lines.',
  whatHappened: 'Answered 3 of 5 questions correctly and read 40 of 44 words right.',
  whyFocus: 'Both missed questions asked what the story hints at but does not say.',
  homeActivity: {
    title: 'Clue hunt',
    minutes: 5,
    steps: ['Read two sentences together.', 'Ask what the story hints at.'],
    tip: 'Any answer with a clue from the text is a good answer.',
  },
};

const withChild = (childMessage: string) => ({ ...good, childMessage });

describe('toneProblems', () => {
  it('accepts a warm note with no numbers for the child', () => {
    expect(toneProblems(good, facts)).toEqual([]);
  });

  it('rejects numbers and number words in the child note', () => {
    expect(toneProblems(withChild('You got 3 right!'), facts)).toContain('child_number');
    expect(toneProblems(withChild('You got three right!'), facts)).toContain('child_number');
  });

  it('rejects scores in the child note', () => {
    expect(toneProblems(withChild('Your score went up today.'), facts)).toContain('child_score');
    expect(toneProblems(withChild('You earned more points.'), facts)).toContain('child_score');
  });

  it('rejects shaming in any field', () => {
    expect(toneProblems(withChild('That was a bad try.'), facts)).toContain('shaming');
    expect(
      toneProblems({ ...good, whatHappened: 'Your child was careless with details.' }, facts),
    ).toContain('shaming');
    expect(
      toneProblems(
        { ...good, homeActivity: { ...good.homeActivity, tip: 'Do not let them be lazy.' } },
        facts,
      ),
    ).toContain('shaming');
  });

  it('rejects promises of a score or a level', () => {
    expect(toneProblems(withChild("Keep going and you'll reach the next level!"), facts)).toContain(
      'promise',
    );
    expect(
      toneProblems({ ...good, whyFocus: 'This practice will raise the score next time.' }, facts),
    ).toContain('promise');
  });

  it('rejects numbers in the parent notes that code did not supply', () => {
    expect(
      toneProblems({ ...good, whatHappened: 'Answered 7 of 9 questions correctly.' }, facts),
    ).toContain('unknown_number');
    // 4 is a real count (words missed), but not the number of questions answered right.
    expect(
      toneProblems({ ...good, whatHappened: 'Answered 4 of 5 questions correctly.' }, facts),
    ).toContain('unknown_number');
  });
});

describe('checkNotes', () => {
  it('passes good notes through', () => {
    expect(checkNotes(good, facts)).toEqual({ ok: true, notes: good });
  });

  it('reports a bad shape before tone', () => {
    expect(checkNotes({ ...good, childMessage: '' }, facts)).toEqual({
      ok: false,
      reason: 'invalid_shape',
    });
    expect(checkNotes('not an object', facts)).toEqual({ ok: false, reason: 'invalid_shape' });
  });

  it('reports tone problems', () => {
    expect(checkNotes(withChild('You got 3 right!'), facts)).toMatchObject({
      ok: false,
      reason: 'tone',
    });
  });
});

describe('standard wording', () => {
  const cases = [
    facts,
    { ...facts, passed: true },
    { ...facts, levelAfter: 13, passed: true },
    { ...facts, levelAfter: 11 },
    { ...facts, focus: null, wordsRight: null, wordsTotal: null },
  ];

  it('passes its own tone checks in every case', () => {
    for (const f of cases) {
      for (const activity of Object.values(STANDARD_ACTIVITIES)) {
        const notes: ModelNotes = {
          childMessage: standardChildMessage(f),
          whatHappened: standardWhatHappened(f),
          whyFocus: standardWhyFocus(f),
          homeActivity: activity,
        };
        expect(checkNotes(notes, f)).toMatchObject({ ok: true });
      }
    }
  });
});
