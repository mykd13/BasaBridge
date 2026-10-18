import { describe, expect, it } from 'vitest';
import { buildNotesPrompt } from './prompt';
import { NotesInput } from './schema';
import { toneProblems } from './checks';
import { NOTES_EN, NOTES_FIL, type NotesKey, say } from './wording';
import {
  standardActivity,
  standardChildMessage,
  standardWhatHappened,
  standardWhyFocus,
} from './standard';
import { writeNotes } from './index';

const input = {
  levelBefore: 12,
  levelAfter: 13,
  passed: true,
  correct: 4,
  total: 5,
  wordsRight: 40,
  wordsTotal: 44,
  focus: 'vocabulary' as const,
};
const facts = NotesInput.parse(input);
const keys = Object.keys(NOTES_EN) as NotesKey[];
const placeholders = (t: string) => (t.match(/\{\w+\}/g) ?? []).sort().join(',');

describe('notes wording catalog', () => {
  it('has the same keys in English and Filipino', () => {
    expect(Object.keys(NOTES_FIL).sort()).toEqual(keys.slice().sort());
  });

  it('marks every Filipino entry as not reviewed', () => {
    for (const k of keys) expect(NOTES_FIL[k].reviewed).toBe(false);
  });

  it('keeps the same placeholders in every language and wording', () => {
    for (const k of keys) {
      const en = NOTES_EN[k] as { standard: string; simple?: string };
      const fil = NOTES_FIL[k] as { standard: string; simple?: string };
      const want = placeholders(en.standard);
      for (const t of [en.simple, fil.standard, fil.simple]) {
        if (t) expect(placeholders(t)).toBe(want);
      }
    }
  });

  it('gives the child note a simple wording in both languages, with no dashes', () => {
    for (const k of keys.filter((x) => x.startsWith('notes.child.'))) {
      expect(NOTES_EN[k]).toHaveProperty('simple');
      expect(NOTES_FIL[k]).toHaveProperty('simple');
    }
    for (const k of keys) {
      for (const lang of [NOTES_EN, NOTES_FIL]) expect(lang[k].standard).not.toMatch(/[–—]/);
    }
  });

  it('falls back to standard when there is no simple wording', () => {
    expect(say('notes.focus.none', {}, { wording: 'simple' })).toBe(
      NOTES_EN['notes.focus.none'].standard,
    );
  });
});

describe('Filipino standard wording', () => {
  const fil = { lang: 'fil' as const };
  it('words each part in Filipino with the code facts', () => {
    expect(standardWhatHappened(facts, fil)).toBe(
      'Sumagot nang tama sa 4 sa 5 tanong. Nabasa nang tama ang 40 sa 44 salita sa binilang na pagsubok. Umakyat sa antas 13.',
    );
    expect(standardWhyFocus(facts, fil)).toContain('pag-alam sa kahulugan ng mga salita');
    expect(standardChildMessage(facts, { ...fil, wording: 'simple' })).toBe(
      'Umakyat ka ng antas! Galing mo!',
    );
    expect(standardActivity('literal', fil).title).toBe('Hanapin sa teksto');
    expect(standardActivity('literal', fil).steps).toHaveLength(3);
  });

  it('uses simple wording only for the child note, never the parent text', () => {
    expect(standardWhatHappened(facts, { lang: 'fil', wording: 'simple' })).toBe(
      standardWhatHappened(facts, fil),
    );
  });

  it('is used by writeNotes when the model is off', async () => {
    const notes = await writeNotes(input, { model: null, lang: 'fil', wording: 'simple' });
    expect(notes.childMessage).toBe('Umakyat ka ng antas! Galing mo!');
    expect(notes.homeActivity.title).toBe('Tiktik ng salita');
  });
});

describe('Filipino model notes', () => {
  it('asks the model for the language and wording, and sends nothing else new', () => {
    const base = buildNotesPrompt(input);
    const fil = buildNotesPrompt(input, { lang: 'fil', wording: 'simple' });
    expect(fil.prompt).toBe(base.prompt);
    expect(fil.instructions).toContain('Filipino');
    expect(fil.instructions).toContain('very short sentences');
    expect(base.instructions).not.toContain('Filipino');
  });

  it('checks levels written as "antas"', () => {
    const notes = {
      childMessage: 'Magaling kang magbasa ngayon.',
      whatHappened: 'Umakyat sa antas 5.',
      whyFocus: 'Tumutulong ang mga tanong sa pag-unawa.',
      homeActivity: {
        title: 'Hanap-salita',
        minutes: 5,
        steps: ['Basahin nang magkasama.', 'Pag-usapan ang kuwento.'],
        tip: 'Dahan-dahan lang.',
      },
    };
    expect(toneProblems(notes, facts)).toContain('unknown_number');
    expect(toneProblems({ ...notes, whatHappened: 'Umakyat sa antas 13.' }, facts)).toEqual([]);
  });
});
