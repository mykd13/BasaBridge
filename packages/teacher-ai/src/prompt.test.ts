import { describe, expect, it } from 'vitest';
import { buildNotesPrompt, notesFacts } from './prompt';
import type { NotesInput } from './schema';

const input: NotesInput = {
  levelBefore: 24,
  levelAfter: 24,
  passed: false,
  correct: 2,
  total: 5,
  wordsRight: 61,
  wordsTotal: 70,
  missed: [
    { skill: 'inferential', subskill: 'feelings', distractor: 'not_stated' },
    { skill: 'vocabulary', subskill: 'word_in_context', distractor: 'word_sense' },
  ],
  flaggedWords: ['harvest'],
  focus: 'inferential',
};

/** Values a careless caller might pass along. None of them may reach the model. */
const leaked = {
  name: 'SENTINEL-NAME-Maria',
  username: 'SENTINEL-USER-maria2016',
  email: 'sentinel@example.com',
  learnerUserId: 'SENTINEL-ID-0f3c',
  audio: 'SENTINEL-AUDIO-base64',
  audioUrl: 'https://storage.example.com/SENTINEL-AUDIO.webm',
};

const FORBIDDEN_KEY = /name|user|email|audio|id$/i;

function keysDeep(v: unknown): string[] {
  if (Array.isArray(v)) return v.flatMap(keysDeep);
  if (v && typeof v === 'object') {
    return Object.entries(v).flatMap(([k, x]) => [k, ...keysDeep(x)]);
  }
  return [];
}

describe('notes prompt privacy', () => {
  const p = buildNotesPrompt({ ...input, ...leaked } as NotesInput);
  const text = `${p.instructions}\n${p.prompt}`;

  it('never contains names, usernames, email, ids or audio passed by a caller', () => {
    for (const value of Object.values(leaked)) expect(text).not.toContain(value);
    expect(text).not.toMatch(/SENTINEL/);
  });

  it('has no forbidden field in the facts sent to the model', () => {
    const facts = JSON.parse(p.prompt.slice(p.prompt.indexOf('{')));
    expect(keysDeep(facts).filter((k) => FORBIDDEN_KEY.test(k))).toEqual([]);
  });

  it('sends exactly the allowed facts', () => {
    // Adding a field to the prompt must be a deliberate change to this list.
    expect(Object.keys(notesFacts(input)).sort()).toEqual([
      'focusMeaning',
      'focusSkill',
      'levelAfter',
      'levelBefore',
      'levelChange',
      'missedQuestions',
      'passed',
      'questionsCorrect',
      'questionsTotal',
      'trickyWords',
      'wordsRight',
      'wordsTotal',
    ]);
    expect(Object.keys(notesFacts(input).missedQuestions[0]!).sort()).toEqual([
      'mistake',
      'skill',
      'subskill',
    ]);
  });

  it('carries the counts, level change and focus that code decided', () => {
    const facts = notesFacts(input);
    expect(facts).toMatchObject({
      levelChange: 'same',
      questionsCorrect: 2,
      questionsTotal: 5,
      focusSkill: 'inferential',
      trickyWords: ['harvest'],
    });
  });
});
