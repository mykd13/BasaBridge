/**
 * Word normalisation for alignment (BB-25).
 * Two words match when their keys are equal. A key ignores case, punctuation, apostrophes and
 * hyphens, and spells numerals out, so "Don't", "dont" and "don’t" share a key and "3" matches "three".
 */

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

/** Comparable form of one word. Empty when the text has no letters or digits (stray punctuation). */
export function wordKey(text: string): string {
  const flat = text.toLowerCase().replace(/(?<=\d),(?=\d{3})/g, '');
  if (/^\d{1,6}$/.test(flat.replace(/[^\p{L}\p{N}]/gu, ''))) {
    return spellNumber(Number(flat.replace(/\D/g, '')));
  }
  const key = flat.replace(/[^\p{L}\p{N}]/gu, '');
  return WORD_ALIASES[key] ?? key;
}

/**
 * Keys a run of consecutive spoken words could print as when written as one word. Covers
 * contractions ("do not"), numbers ("twenty one") and words the provider split ("in to").
 */
export function joinedKeys(keys: string[]): string[] {
  const contraction = CONTRACTIONS[keys.join(' ')];
  const joined = keys.join('');
  return contraction ? [contraction, joined] : [joined];
}
