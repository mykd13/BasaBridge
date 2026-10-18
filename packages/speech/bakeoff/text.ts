/** Word normalisation shared by passages, human transcripts and provider output. */

const NUMBER_WORDS = [
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
  'twenty',
];

/** Lower case, no punctuation, apostrophes dropped, hyphens split, small numbers spelled out. */
export function normaliseWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w.length > 0)
    .map((w) => (/^\d+$/.test(w) && Number(w) <= 20 ? (NUMBER_WORDS[Number(w)] ?? w) : w));
}
