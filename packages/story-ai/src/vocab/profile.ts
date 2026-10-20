/**
 * Vocabulary profile of a passage against the word list (BB-72). Pure functions: no model calls,
 * no learner data.
 */
import { LOCAL_WORDS } from '../guidelines';
import { CHILD_WORDS } from './child-words';
import { wordRank } from './word-list';

export interface VocabularyProfile {
  /** Words that were counted. Names of people and places are left out. */
  counted: number;
  /** Counted words on the list within the allowed rank, child words, local words or number words. */
  known: number;
  /** known / counted. 1 when nothing was counted. */
  knownShare: number;
  /** Distinct words that are not known, lowercase, in order of first use. */
  newWords: string[];
}

const TOKEN = /[A-Za-z]+(?:[-'’][A-Za-z]+)*/g;

/** Base forms a word might come from: smiles, smiled, smiling to smile; tomatoes to tomato. */
function baseForms(word: string): string[] {
  const forms = [word];
  for (const ending of ['ies', 'ied', 'es', 's', 'ed', 'd', 'ing']) {
    if (!word.endsWith(ending) || word.length <= ending.length + 1) continue;
    const root = word.slice(0, -ending.length);
    if (ending === 'ies' || ending === 'ied') forms.push(`${root}y`);
    else forms.push(root);
    if (ending === 'ing' || ending === 'ed') forms.push(`${root}e`, root.replace(/(.)\1$/, '$1'));
  }
  return forms;
}

const isChildWord = (word: string) => baseForms(word).some((f) => CHILD_WORDS.has(f));

/** Light stem so that crab and crabs, or scurry and scurried, are one new word. */
function stem(word: string): string {
  return word
    .replace(/ies$|ied$/, 'y')
    .replace(/(?:es|s|ed|ing)$/, '')
    .replace(/(.)\1$/, '$1');
}

/**
 * Splits a passage into lowercase word parts. A hyphenated local word (halo-halo) stays whole;
 * other hyphenated words and contractions are checked part by part. Capitalised words that never
 * appear in lowercase in the passage are names and are skipped.
 */
function wordParts(passage: string): string[] {
  const tokens = passage.match(TOKEN) ?? [];
  const lowercaseUses = new Set(tokens.filter((t) => /^[a-z]/.test(t)).map((t) => t.toLowerCase()));
  const parts: string[] = [];
  for (const token of tokens) {
    const lower = token.toLowerCase().replace(/’/g, "'");
    if (LOCAL_WORDS.has(lower)) {
      parts.push(lower);
      continue;
    }
    for (const part of lower.split(/[-']/)) {
      if (part === '') continue;
      const isName = /^[A-Z]/.test(token) && !lowercaseUses.has(lower) && wordRank(part) === null;
      if (!isName) parts.push(part);
    }
  }
  return parts;
}

/** Profile of a passage when words up to `maxRank` on the list count as known. */
export function vocabularyProfile(passage: string, maxRank: number): VocabularyProfile {
  const parts = wordParts(passage);
  const newWords = new Map<string, string>();
  let known = 0;
  for (const part of parts) {
    const rank = wordRank(part);
    if (LOCAL_WORDS.has(part) || isChildWord(part) || (rank !== null && rank <= maxRank)) {
      known++;
      continue;
    }
    const key = stem(part);
    if (!newWords.has(key)) newWords.set(key, part);
  }
  return {
    counted: parts.length,
    known,
    knownShare: parts.length === 0 ? 1 : known / parts.length,
    newWords: [...newWords.values()],
  };
}
