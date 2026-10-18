/**
 * Username filter (BB-63). Refuses offensive words and personal details: phone numbers, full
 * names and school names. The result is a code only. It never carries the word that matched, so
 * neither a screen nor a log can repeat it. The screens turn each code into catalog text that
 * says what to change (BB-12, BB-58).
 *
 * Length limits stay with the auth config (BB-7). This file only judges what the name says.
 */
import {
  FIRST_NAMES,
  OFFENSIVE_ANYWHERE,
  OFFENSIVE_WHOLE,
  SCHOOL_ANYWHERE,
  SCHOOL_SUFFIX,
  SURNAMES,
} from './username-words';

/**
 * USERNAME_CHARS: use letters and numbers only (the A2 hint).
 * USERNAME_OFFENSIVE: pick kinder words.
 * USERNAME_PHONE: take out the phone number.
 * USERNAME_FULL_NAME: pick a made-up name, not a real one.
 * USERNAME_SCHOOL: take out the school name.
 */
export const USERNAME_CODES = {
  chars: 'USERNAME_CHARS',
  offensive: 'USERNAME_OFFENSIVE',
  phone: 'USERNAME_PHONE',
  fullName: 'USERNAME_FULL_NAME',
  school: 'USERNAME_SCHOOL',
} as const;

export type UsernameCode = (typeof USERNAME_CODES)[keyof typeof USERNAME_CODES];

export type UsernameCheck = { ok: true } | { ok: false; code: UsernameCode };

/** Seven digits in a row, or nine in total, is treated as a phone number. */
const PHONE_RUN = /\d{7,}/;
const PHONE_TOTAL_DIGITS = 9;

/** Digits people use in place of letters. Symbols are already refused by the character rule. */
const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
};

/** "fuck" becomes f+u+c+k+, so stretched spellings such as "fuuuck" still match. */
const stretch = (word: string) => [...word].map((c) => `${c}+`).join('');

const anywhere = (words: readonly string[]) => new RegExp(words.map(stretch).join('|'));
const suffix = (words: readonly string[]) => new RegExp(`(?:${words.map(stretch).join('|')})$`);

const OFFENSIVE_ANYWHERE_RE = anywhere(OFFENSIVE_ANYWHERE);
/** Exact, not stretched: a stretched "bobo" would also refuse "booboo". */
const OFFENSIVE_WHOLE_SET = new Set<string>(OFFENSIVE_WHOLE);
const SCHOOL_ANYWHERE_RE = anywhere(SCHOOL_ANYWHERE);
const SCHOOL_SUFFIX_RE = suffix(SCHOOL_SUFFIX);

/** Lowercase letters only. Digits are dropped, so "juan2010delacruz" reads as a name. */
function lettersOnly(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z]/g, '');
}

/** Lowercase with look-alike digits read as letters, so "b1tch" reads as a word. */
function deLeet(raw: string): string {
  return [...raw.toLowerCase()]
    .map((c) => LEET[c] ?? c)
    .join('')
    .replace(/[^a-z]/g, '');
}

function isOffensive(raw: string): boolean {
  return [lettersOnly(raw), deLeet(raw)].some(
    (form) => OFFENSIVE_ANYWHERE_RE.test(form) || OFFENSIVE_WHOLE_SET.has(form),
  );
}

function isPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '').length;
  return PHONE_RUN.test(raw) || digits >= PHONE_TOTAL_DIGITS;
}

function isSchool(raw: string): boolean {
  const form = lettersOnly(raw);
  return SCHOOL_ANYWHERE_RE.test(form) || SCHOOL_SUFFIX_RE.test(form);
}

/** Every index where `word` starts in `text`. */
function startsOf(text: string, word: string): number[] {
  const out: number[] = [];
  for (let i = text.indexOf(word); i !== -1; i = text.indexOf(word, i + 1)) out.push(i);
  return out;
}

/**
 * A first name next to a surname, in either order. One letter between them is allowed for a
 * middle initial, as in "juanpdelacruz".
 */
function isFullName(raw: string): boolean {
  const form = lettersOnly(raw);
  const adjacent = (left: readonly string[], right: readonly string[]) => {
    const rightStarts = new Set<number>();
    for (const word of right) for (const i of startsOf(form, word)) rightStarts.add(i);
    if (rightStarts.size === 0) return false;
    for (const word of left) {
      for (const i of startsOf(form, word)) {
        const end = i + word.length;
        if (rightStarts.has(end) || rightStarts.has(end + 1)) return true;
      }
    }
    return false;
  };
  return adjacent(FIRST_NAMES, SURNAMES) || adjacent(SURNAMES, FIRST_NAMES);
}

/** Judges a username. Checks run from the plainest fix to the most specific one. */
export function checkUsername(raw: string): UsernameCheck {
  const name = raw.trim();
  if (!/^[A-Za-z0-9]+$/.test(name)) return { ok: false, code: USERNAME_CODES.chars };
  if (isPhone(name)) return { ok: false, code: USERNAME_CODES.phone };
  if (isOffensive(name)) return { ok: false, code: USERNAME_CODES.offensive };
  if (isSchool(name)) return { ok: false, code: USERNAME_CODES.school };
  if (isFullName(name)) return { ok: false, code: USERNAME_CODES.fullName };
  return { ok: true };
}
