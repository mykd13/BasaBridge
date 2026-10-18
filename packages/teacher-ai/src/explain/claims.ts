/**
 * Checks that a reading-pattern note claims no more than the data shows. They run on the model's
 * reply (BB-28 step B4) and on the standard wording, so both are held to the same rules.
 * A note that fails is replaced by standard wording; it is never repaired or shown.
 */
import type { PatternFacts } from './types';

/** Words that mark a sentence as a possibility rather than a finding. */
const HEDGE = /\b(maybe|might|may|perhaps|possibly|seems?|could|not sure|guess)\b/i;
/** Never true of a reading pattern, however sure code is. */
const ABSOLUTE =
  /\b(always|never|every time|every single|all the time|definitely|certainly|for sure|without fail)\b/gi;
/** Only fair for a pattern code is sure of. */
const FREQUENT =
  /\b(often|usually|mostly|most of the time|a lot|keeps?|again and again|regularly)\b/gi;
// Kept in step with the child-note number words in BB-20's checks.ts; merged with them in step B4.
const NUMBER_WORDS =
  /\b(zero|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|half|percent)\b/i;
const QUOTES = [/“([^”]+)”/g, /"([^"]+)"/g, /‘([^’]+)’/g];

/** True when a sentence that should be a possibility does not hedge. */
export function missingHedge(text: string): boolean {
  return !HEDGE.test(text);
}

/** Words that claim more than the phrasing allows, lowercased, in the order they appear. */
export function overclaims(text: string, phrasing: 'possible' | 'state'): string[] {
  const found = [...text.matchAll(ABSOLUTE)].map((m) => m[0].toLowerCase());
  if (phrasing === 'possible') {
    found.push(...[...text.matchAll(FREQUENT)].map((m) => m[0].toLowerCase()));
  }
  return found;
}

/** True when a child note has a number in digits or words. */
export function childHasNumber(text: string): boolean {
  return /\d/.test(text) || NUMBER_WORDS.test(text);
}

function normal(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]+$/, '');
}

/** Everything a note puts in quotation marks, lowercased and without trailing punctuation. */
export function quotedWords(text: string): string[] {
  return QUOTES.flatMap((re) => [...text.matchAll(re)].map((m) => normal(m[1]!)));
}

/**
 * What a note may quote: the example words code found, plus what each pattern is about
 * ("-ing" and "ing", "th", "was" and "saw"). Missing pauses add only their example words.
 */
export function allowedQuotes(patterns: PatternFacts[]): Set<string> {
  const allowed = new Set<string>();
  for (const p of patterns) {
    for (const e of p.examples) {
      allowed.add(normal(e.expected));
      if (e.heard !== null) allowed.add(normal(e.heard));
    }
    if (p.kind === 'dropped_ending') allowed.add(`-${p.key}`).add(p.key);
    if (p.kind === 'letter_pattern') allowed.add(p.key);
    if (p.kind === 'repeated_substitution') {
      for (const word of p.key.split('>')) allowed.add(normal(word));
    }
  }
  return allowed;
}

/** Quoted words that code did not give, so the note made them up. */
export function unknownWords(text: string, allowed: Set<string>): string[] {
  return quotedWords(text).filter((w) => !allowed.has(w));
}
