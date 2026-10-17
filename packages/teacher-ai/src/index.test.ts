import { Decision } from '@basabridge/contracts';
import type { Lesson } from '@basabridge/learn';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  type NotesInput,
  type NotesModel,
  STANDARD_ACTIVITIES,
  isValidNotes,
  notesDecision,
  standardActivity,
  writeNotes,
} from './index';

const input: NotesInput = {
  levelBefore: 24,
  levelAfter: 24,
  passed: false,
  correct: 3,
  total: 5,
  missed: [
    { skill: 'inferential', subskill: 'feelings', distractor: 'not_stated' },
    { skill: 'inferential', subskill: 'feelings', distractor: 'wrong_detail' },
  ],
  focus: 'inferential',
};

const reply = {
  childMessage: 'You read the whole story. Next time, look for clues about how people feel.',
  whatHappened: 'Answered 3 of 5 questions correctly. Both misses asked how a character felt.',
  whyFocus: 'Questions about feelings ask the reader to use clues the story does not spell out.',
  homeActivity: {
    title: 'Feelings detective',
    minutes: 5,
    steps: ['Read a page together.', 'Ask how a character feels and which words show it.'],
    tip: 'Any feeling is fine if your child can point to a clue.',
  },
};

const lesson = (over: Partial<Lesson>): Lesson => ({
  id: 'feelings-middle',
  subject: 'feelings',
  band: 'middle',
  title: 'How do they feel?',
  goal: 'I can tell how someone feels from clues.',
  steps: [{ kind: 'explain', text: 'Clues show feelings.' }],
  status: 'reviewed',
  ...over,
});

const answers =
  (value: unknown): NotesModel =>
  async () =>
    value;

describe('writeNotes', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses the model notes when they pass every check', async () => {
    const notes = await writeNotes(input, { model: answers(reply) });
    expect(notes).toMatchObject({
      childMessage: reply.childMessage,
      whatHappened: reply.whatHappened,
      whyFocus: reply.whyFocus,
      source: 'ai',
      fallbackReason: null,
    });
    expect(notes.homeActivity.source).toBe('ai');
  });

  it('sends the model only the built prompt', async () => {
    const model = vi.fn(answers(reply));
    await writeNotes({ ...input, username: 'SENTINEL-USER' } as NotesInput, { model });
    expect(model).toHaveBeenCalledOnce();
    expect(JSON.stringify(model.mock.calls[0])).not.toContain('SENTINEL');
  });

  it('falls back to standard wording when the reply has the wrong shape', async () => {
    const notes = await writeNotes(input, { model: answers({ childMessage: 'Hi' }) });
    expect(notes).toMatchObject({ source: 'standard', fallbackReason: 'invalid_shape' });
    expect(notes.homeActivity).toBe(STANDARD_ACTIVITIES.inferential);
  });

  it('falls back when the child note has a score or a number', async () => {
    const notes = await writeNotes(input, {
      model: answers({ ...reply, childMessage: 'You got 3 out of 5. Good job!' }),
    });
    expect(notes).toMatchObject({ source: 'standard', fallbackReason: 'tone' });
    expect(notes.childMessage).not.toMatch(/\d/);
  });

  it('falls back when the model call fails', async () => {
    const notes = await writeNotes(input, {
      model: async () => {
        throw new Error('gateway timeout');
      },
    });
    expect(notes).toMatchObject({ source: 'standard', fallbackReason: 'call_failed' });
  });

  it('uses standard wording when no model is configured', async () => {
    vi.stubEnv('NOTES_MODEL', '');
    expect(await writeNotes(input)).toMatchObject({
      source: 'standard',
      fallbackReason: 'not_configured',
    });
    expect(await writeNotes(input, { model: null })).toMatchObject({ source: 'standard' });
  });

  it('links a reviewed lesson for the main gap, whatever the model says', async () => {
    const lessons = [lesson({}), lesson({ id: 'draft', status: 'draft' })];
    const ai = await writeNotes(input, { model: answers(reply), lessons });
    const standard = await writeNotes(input, { model: null, lessons });
    expect(ai.lesson).toEqual({ id: 'feelings-middle', title: 'How do they feel?' });
    expect(standard.lesson).toEqual(ai.lesson);
  });

  it('links no lesson when the gap has only a draft lesson', async () => {
    const notes = await writeNotes(input, {
      model: null,
      lessons: [lesson({ status: 'draft' })],
    });
    expect(notes.lesson).toBeNull();
  });
});

describe('notesDecision', () => {
  it('stores AI notes with their source and the facts they came from', async () => {
    const notes = await writeNotes(input, { model: answers(reply), lessons: [lesson({})] });
    const d = notesDecision(notes, input);
    expect(Decision.safeParse(d).success).toBe(true);
    expect(d.title).toBe('Notes written by the AI Teacher');
    expect(d.evidence).toMatchObject({
      source: 'ai',
      fallbackReason: null,
      facts: { questionsCorrect: 3, questionsTotal: 5, focusSkill: 'inferential' },
      notes: { childMessage: reply.childMessage },
      lessonId: 'feelings-middle',
    });
  });

  it('stores standard notes as standard, with the reason', async () => {
    const notes = await writeNotes(input, { model: null });
    const d = notesDecision(notes, input);
    expect(d.title).toBe('Notes in standard wording');
    expect(d.evidence).toMatchObject({ source: 'standard', fallbackReason: 'not_configured' });
  });

  it('keeps names and usernames out of the stored evidence', async () => {
    const leaky = { ...input, username: 'SENTINEL-USER', name: 'SENTINEL-NAME' } as NotesInput;
    const d = notesDecision(await writeNotes(leaky, { model: null }), leaky);
    expect(JSON.stringify(d)).not.toContain('SENTINEL');
  });
});

describe('standard activities', () => {
  it('exist for every comprehension skill and never use AI wording', () => {
    for (const a of Object.values(STANDARD_ACTIVITIES)) {
      expect(a.source).toBe('standard');
      expect(a.steps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('falls back to the literal activity when there is no focus', () => {
    expect(standardActivity(null)).toBe(STANDARD_ACTIVITIES.literal);
  });
});

describe('isValidNotes', () => {
  const good = {
    childMessage: 'Nice reading today.',
    whatHappened: 'Four of five correct.',
    whyFocus: 'Vocabulary is the lowest so far.',
    homeActivity: { title: 'Word detective', minutes: 5, steps: ['a', 'b'], tip: 'tip' },
  };

  it('accepts a well-formed reply', () => {
    expect(isValidNotes(good)).toBe(true);
  });

  it('rejects missing, empty or oversized fields', () => {
    expect(isValidNotes(null)).toBe(false);
    expect(isValidNotes({ ...good, childMessage: '' })).toBe(false);
    expect(isValidNotes({ ...good, childMessage: 'x'.repeat(400) })).toBe(false);
    expect(
      isValidNotes({ ...good, homeActivity: { ...good.homeActivity, steps: ['only one'] } }),
    ).toBe(false);
  });
});
