/**
 * Word normalisation for alignment (BB-25).
 * A word has one or more keys. Two words match when they share a key. Keys ignore case, accents,
 * punctuation, apostrophes and hyphens, and spell numerals out, so "Don't", "dont" and "don’t" share
 * a key and "3" matches "three". Some printed forms can be said more than one way (the year 1990 is
 * "nineteen ninety"), so a word can carry several keys.
 */

/** Longest run of spoken words that can stand for one printed word, e.g. "one hundred twenty one". */
export const MAX_JOIN = 5;

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

/** Spell a whole number as one joined string, e.g. 21 becomes "twentyone". Up to 999,999. */
function spellNumber(n: number): string {
  if (n < 20) return ONES[n]!;
  if (n < 100) return TENS[Math.floor(n / 10)]! + (n % 10 ? ONES[n % 10]! : '');
  if (n < 1000) {
    const rest = n % 100;
    return ONES[Math.floor(n / 100)]! + 'hundred' + (rest ? spellNumber(rest) : '');
  }
  const rest = n % 1000;
  return spellNumber(Math.floor(n / 1000)) + 'thousand' + (rest ? spellNumber(rest) : '');
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
    const spelled = spellNumber(n);
    const keys = [spelled];
    // "a hundred" and "a thousand"
    if (spelled.startsWith('onehundred') || spelled.startsWith('onethousand')) {
      keys.push('a' + spelled.slice(3));
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
 * Two spoken words that print as one contraction. Providers often return "do not" for "don't".
 * Keys are the joined spoken words, values are the key of the contraction.
 */
const CONTRACTIONS: Record<string, string> = {
  'do not': 'dont',
  'does not': 'doesnt',
  'did not': 'didnt',
  'is not': 'isnt',
  'are not': 'arent',
  'was not': 'wasnt',
  'were not': 'werent',
  'have not': 'havent',
  'has not': 'hasnt',
  'had not': 'hadnt',
  'would not': 'wouldnt',
  'could not': 'couldnt',
  'should not': 'shouldnt',
  'will not': 'wont',
  'can not': 'cant',
  'i am': 'im',
  'you are': 'youre',
  'they are': 'theyre',
  'i have': 'ive',
  'you have': 'youve',
  'we have': 'weve',
  'they have': 'theyve',
  'he is': 'hes',
  'she is': 'shes',
  'it is': 'its',
  'that is': 'thats',
  'there is': 'theres',
  'what is': 'whats',
  'let us': 'lets',
};

/** Keys of one word, best first. Empty when the text has no letters or digits (stray punctuation). */
export function wordKeys(text: string): string[] {
  const edgeless = text.trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  const plain = edgeless.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const numeric = numberKeys(plain);
  if (numeric) return numeric;
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
 * ("do not"), numbers ("twenty one") and words a provider split ("in to").
 */
export function joinedKeys(keys: string[]): string[] {
  const contraction = CONTRACTIONS[keys.join(' ')];
  const joined = keys.join('');
  return contraction ? [contraction, joined] : [joined];
}
