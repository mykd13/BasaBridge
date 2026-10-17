import { describe, expect, it } from 'vitest';
import { NotesInput } from './schema';
import { standardChildMessage, standardWhatHappened, standardWhyFocus } from './standard';

const facts = (over: Partial<NotesInput> = {}) =>
  NotesInput.parse({
    levelBefore: 12,
    levelAfter: 12,
    passed: false,
    correct: 2,
    total: 5,
    focus: 'inferential',
    ...over,
  });

describe('standard wording', () => {
  it('words the child note from the level change and the pass', () => {
    expect(standardChildMessage(facts({ levelAfter: 13, passed: true }))).toMatch(/moved up/i);
    expect(standardChildMessage(facts({ levelAfter: 11 }))).toMatch(/lighter/);
    expect(standardChildMessage(facts({ passed: true }))).toMatch(/found the answers/);
    expect(standardChildMessage(facts())).toMatch(/thank you/i);
  });

  it('gives the parent the counts and the level', () => {
    expect(standardWhatHappened(facts())).toBe(
      'Answered 2 of 5 questions correctly. Stays at level 12.',
    );
    expect(
      standardWhatHappened(facts({ wordsRight: 40, wordsTotal: 44, levelAfter: 13 })),
    ).toBe(
      'Answered 2 of 5 questions correctly. Read 40 of 44 words right on the counted try. Moved up to level 13.',
    );
  });

  it('explains the focus skill, or says there is none yet', () => {
    expect(standardWhyFocus(facts())).toMatch(/reading between the lines/);
    expect(standardWhyFocus(facts({ focus: null }))).toMatch(/not enough evidence/);
  });
});

describe('NotesInput', () => {
  it('drops fields it does not know, such as a username', () => {
    const parsed = facts({ username: 'secret-kid' } as Partial<NotesInput>);
    expect(parsed).not.toHaveProperty('username');
  });
});
