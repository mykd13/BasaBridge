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

describe('claims and safety (review of PR 13)', () => {
  const withParent = (over: Partial<ModelNotes>): ModelNotes => ({ ...good, ...over });
  const problems = (n: ModelNotes) => toneProblems(n, facts);

  it('rejects promises in either word order, but not "level by level"', () => {
    expect(problems(withParent({ whyFocus: 'Your level will go up soon.' }))).toContain('promise');
    expect(problems(withParent({ whyFocus: 'Their score will improve a lot.' }))).toContain(
      'promise',
    );
    expect(
      problems(
        withParent({ whyFocus: 'The next stories will practise this skill, level by level.' }),
      ),
    ).not.toContain('promise');
  });

  it('checks number words in parent text', () => {
    expect(
      problems(withParent({ whatHappened: 'Four of five questions were answered correctly.' })),
    ).toContain('unknown_number');
    expect(
      problems(withParent({ whatHappened: 'Three of five questions were answered correctly.' })),
    ).toEqual([]);
    expect(
      problems(withParent({ whatHappened: 'Tatlo sa limang tanong ang tama, walo ang mali.' })),
    ).not.toEqual([]);
  });

  it('keeps levels apart from counts', () => {
    const t = problems(withParent({ whatHappened: 'Moved up to level 5 after this story.' }));
    expect(t).toContain('unknown_number');
    expect(t).toContain('wrong_claim');
    expect(problems(withParent({ whatHappened: 'Stays at level 12.' }))).toEqual([]);
    expect(problems(withParent({ whatHappened: 'Stays at level five.' }))).toContain(
      'unknown_number',
    );
  });

  it('checks pass and level movement against the facts', () => {
    expect(
      problems(withParent({ whatHappened: 'Your child passed this story and moved up.' })),
    ).toContain('wrong_claim');
    expect(
      problems(withParent({ whatHappened: 'This story was not passed, so the level stays.' })),
    ).not.toContain('wrong_claim');
    const passedFacts = NotesInput.parse({ ...facts, passed: true });
    expect(
      toneProblems(
        withParent({ whatHappened: 'Your child did not pass this story.' }),
        passedFacts,
      ),
    ).toContain('wrong_claim');
    const up = NotesInput.parse({ ...facts, levelAfter: 13, passed: true });
    expect(toneProblems(withParent({ whatHappened: 'Moved down to level 13.' }), up)).toContain(
      'wrong_claim',
    );
  });

  it('rejects number words, ranks and shaming words in the child note', () => {
    for (const msg of [
      'You got one question wrong.',
      'Try the second one first.',
      'Isa pang kuwento ang basahin mo.',
      'You made many mistakes and were slow.',
    ]) {
      expect(problems(withChild(msg))).not.toEqual([]);
    }
  });

  it('rejects links, contact details and requests for personal data in every field', () => {
    const bad = [
      'Tell me your full name and school at www.x.com',
      'Visit http://evil.example/x to download a game',
      'Send us a photo at someone@example.com',
      'Call 0917 123 4567 for more stories',
      'Message us on Facebook',
      'Share your address with the teacher',
    ];
    for (const text of bad) {
      expect(problems(withChild(text))).toContain('unsafe_content');
      expect(
        problems({ ...good, homeActivity: { ...good.homeActivity, steps: [text, 'Then talk.'] } }),
      ).toContain('unsafe_content');
      expect(problems({ ...good, homeActivity: { ...good.homeActivity, tip: text } })).toContain(
        'unsafe_content',
      );
      expect(checkNotes(withChild(text), facts).ok).toBe(false);
    }
  });
});
