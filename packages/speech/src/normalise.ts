/**
 * Word normalisation for alignment (BB-25).
 * A word has one or more keys. Two words match when they share a key. Keys ignore case, accents,
 * punctuation, apostrophes and hyphens, and spell numerals out, so "Don't", "dont" and "don’t" share
 * a key and "3" matches "three". Some printed forms can be said more than one way (the year 1990 is
 * "nineteen ninety", 105 is "one hundred five" or "one hundred and five"), so a word can carry
 * several keys.
 *
 * Known limits: numbers of a million or more, ordinals past 99th, and years before 1100 are not
 * spelled out, so they only match when the provider returns the same digits.
 */

/** Longest run of spoken words that can stand for one printed word, e.g. "one thousand one hundred and twenty one". */
export const MAX_JOIN = 8;

const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const ORDINAL_ONES = [
  '',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
  'thirteenth',
  'fourteenth',
  'fifteenth',
  'sixteenth',
  'seventeenth',
  'eighteenth',
  'nineteenth',
];
const ORDINAL_TENS = [
  '',
  '',
  'twentieth',
  'thirtieth',
  'fortieth',
  'fiftieth',
  'sixtieth',
  'seventieth',
  'eightieth',
  'ninetieth',
];

/**
 * Spell a whole number as one joined string, e.g. 21 becomes "twentyone". Up to 999,999.
 * With `and`, spell it the British way: 105 is "onehundredandfive".
 */
function spellNumber(n: number, and = false): string {
  if (n < 20) return ONES[n]!;
  if (n < 100) return TENS[Math.floor(n / 10)]! + (n % 10 ? ONES[n % 10]! : '');
  if (n < 1000) {
    const rest = n % 100;
    return (
      ONES[Math.floor(n / 100)]! + 'hundred' + (rest ? (and ? 'and' : '') + spellNumber(rest) : '')
    );
  }
  const rest = n % 1000;
  return (
    spellNumber(Math.floor(n / 1000), and) +
    'thousand' +
    (rest ? (and && rest < 100 ? 'and' : '') + spellNumber(rest, and) : '')
  );
}

/** Pairs of digits as spoken for years and times: 1990 is "nineteen ninety", 1905 "nineteen oh five". */
function spellPair(hi: number, lo: number): string {
  if (lo === 0) return spellNumber(hi) + 'hundred';
  return spellNumber(hi) + (lo < 10 ? 'oh' : '') + spellNumber(lo);
}

function spellOrdinal(n: number): string | null {
  if (n >= 1 && n < 20) return ORDINAL_ONES[n]!;
  if (n >= 20 && n < 100) {
    return n % 10 ? TENS[Math.floor(n / 10)]! + ORDINAL_ONES[n % 10]! : ORDINAL_TENS[n / 10]!;
  }
  return null;
}

/** Keys for a printed number, or null when the text is not one of the forms we spell out. */
function numberKeys(text: string): string[] | null {
  const integer = /^(?:\d{1,3}(?:,\d{3})+|\d+)$/.exec(text);
  if (integer) {
    const n = Number(text.replace(/,/g, ''));
    if (n > 999_999) return null;
    const keys = [spellNumber(n)];
    const british = spellNumber(n, true);
    if (british !== keys[0]) keys.push(british);
    // "a hundred" and "a thousand"
    for (const key of [...keys]) {
      if (key.startsWith('onehundred') || key.startsWith('onethousand'))
        keys.push('a' + key.slice(3));
    }
    // Years said in pairs: 1990, 1905, 1900, 2024
    if (n >= 1100 && n <= 2099 && !text.includes(',') && !(n >= 2000 && n < 2010)) {
      keys.push(spellPair(Math.floor(n / 100), n % 100));
    }
    return keys;
  }
  const time = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (time) {
    const hour = spellNumber(Number(time[1]));
    const minute = Number(time[2]);
    if (minute >= 60) return null;
    return minute === 0
      ? [hour + 'oclock', hour]
      : [hour + (minute < 10 ? 'oh' : '') + spellNumber(minute)];
  }
  const decimal = /^(\d{1,6})\.(\d+)$/.exec(text);
  if (decimal) {
    const digits = [...decimal[2]!].map((d) => ONES[Number(d)]!).join('');
    return [spellNumber(Number(decimal[1])) + 'point' + digits];
  }
  const ordinal = /^(\d+)(?:st|nd|rd|th)$/.exec(text);
  if (ordinal) {
    const word = spellOrdinal(Number(ordinal[1]));
    return word ? [word] : null;
  }
  return null;
}

/** "cannot" is one word in print and two when spoken, so both forms share a key. */
const WORD_ALIASES: Record<string, string> = { cannot: 'cant' };

/**
 * Contractions are built from two spoken words: any word followed by one of these joins to the
 * word plus the suffix, so "I will", "we will" and "the dog will" all have a contraction form
 * ("ill", "well", "dogll"). This covers pronouns, nouns ("Mom's home" for "Mom is home") and
 * modals ("could have" for "could've") without listing each pair.
 *
 * Only keys the other side actually has are ever used, and alignment is by position, so a join
 * that does not exist in the text does nothing. Some keys equal a plain word ("we will" and "well",
 * "she will" and "shell", "we are" and "were", "it is" and "its"). That is accepted: a recogniser
 * cannot tell them apart by sound, and the position check keeps it from changing other words.
 */
const SPOKEN_SUFFIXES: Record<string, string> = {
  will: 'll',
  would: 'd',
  had: 'd',
  are: 're',
  have: 've',
  is: 's',
  has: 's',
  am: 'm',
  not: 'nt',
};

/** Contractions that are not the first word plus a suffix: "will not" is "won't". */
const IRREGULAR_CONTRACTIONS: Record<string, string> = {
  'will not': 'wont',
  'can not': 'cant',
  'shall not': 'shant',
  'let us': 'lets',
};

/** Keys of one word, best first. Empty when the text has no letters or digits (stray punctuation). */
export function wordKeys(text: string): string[] {
  const trimmed = text.trim().replace(/[.,;:!?"'”’)\]]+$/u, '');
  // "50%" is said "fifty percent".
  const percent = /^(.+?)%$/.exec(trimmed);
  if (percent) {
    const base = wordKeys(percent[1]!);
    if (base.length > 0 && /\d/.test(percent[1]!)) return base.map((key) => key + 'percent');
  }
  const edgeless = trimmed.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  const plain = edgeless.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const numeric = numberKeys(plain);
  if (numeric) return numeric;
  // "10-year-old" is said "ten year old": spell any number inside a hyphenated word.
  if (plain.includes('-') && /\d/.test(plain)) {
    const parts = plain.split('-').map((part) => wordKeys(part)[0] ?? '');
    const joined = parts.join('');
    if (joined !== '') return [joined];
  }
  const key = plain.replace(/[^\p{L}\p{N}]/gu, '');
  if (key === '') return [];
  return [WORD_ALIASES[key] ?? key];
}

/** True when two words share a key. */
export function keysMatch(a: string[], b: string[]): boolean {
  return a.some((key) => b.includes(key));
}

/**
 * Keys a run of consecutive words could print as when written as one word. Covers contractions
 * ("I will" for "I'll"), numbers ("twenty one") and words a provider split ("in to").
 */
export function joinedKeys(keys: string[]): string[] {
  const joined = keys.join('');
  if (keys.length !== 2) return [joined];
  const irregular = IRREGULAR_CONTRACTIONS[keys.join(' ')];
  const suffix = SPOKEN_SUFFIXES[keys[1]!];
  const out: string[] = [];
  if (irregular) out.push(irregular);
  if (suffix) out.push(keys[0] + suffix);
  out.push(joined);
  return out;
}
