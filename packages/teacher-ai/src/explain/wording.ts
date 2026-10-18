/**
 * Standard wording for reading patterns, built from counts and example words only. It is shown
 * whenever the model is not configured, fails, or returns something that does not pass the checks.
 * Child lines carry no numbers. Possibility lines always hedge. Nothing here says "always".
 */
import { phrasingFor, surenessLine } from './sureness';
import type { PatternFacts, WordPair } from './types';

type Said = 'possible' | 'state';

/** The example worth quoting: one the child said differently, else the first one. */
export function pickExample(p: PatternFacts): WordPair | null {
  return (
    p.examples.find((e) => e.heard !== null && e.heard !== e.expected) ?? p.examples[0] ?? null
  );
}

/** The expected and heard words of a substitution, from its example or else from its key. */
function substitution(p: PatternFacts): { expected: string; heard: string | null } {
  const ex = pickExample(p);
  if (ex) return ex;
  const [expected = p.key, heard = null] = p.key.split('>');
  return { expected, heard };
}

const q = (word: string) => `“${word}”`;

/** "for example reading “running” as “run”", or nothing when there is no useful example. */
function parentExample(ex: WordPair | null): string {
  if (!ex) return '';
  if (ex.heard === null || ex.heard === ex.expected) return `, for example in ${q(ex.expected)}`;
  return `, for example reading ${q(ex.expected)} as ${q(ex.heard)}`;
}

/** The counts behind a parent line, so a parent can read the count as a rate. */
function parentCounts(p: PatternFacts, scope: string): string {
  return `This happened ${p.count} of the ${p.opportunities} times ${scope}.`;
}

export function standardChildLine(p: PatternFacts, said: Said): string {
  const ex = pickExample(p);
  switch (p.kind) {
    case 'dropped_ending': {
      const heard = ex && ex.heard !== null && ex.heard !== ex.expected ? ex : null;
      const lead =
        said === 'state'
          ? `You often leave the ${q(`-${p.key}`)} off words.`
          : `You might be leaving the ${q(`-${p.key}`)} off some words.`;
      const example = heard ? ` You said ${q(heard.heard!)} for ${q(heard.expected)}.` : '';
      return `${lead}${example} Say the whole word, right to the end.`;
    }
    case 'letter_pattern': {
      const like = ex ? `, like in ${q(ex.expected)}` : '';
      const lead =
        said === 'state'
          ? `The letters ${q(p.key)} are tricky for you${like}.`
          : `The letters ${q(p.key)} might be a little tricky${like}.`;
      return `${lead} Go slowly when you see them.`;
    }
    case 'repeated_substitution': {
      const { expected, heard } = substitution(p);
      const lead =
        heard === null
          ? said === 'state'
            ? `The word ${q(expected)} is tricky for you.`
            : `The word ${q(expected)} might be a little tricky.`
          : said === 'state'
            ? `You often say ${q(heard)} when the word is ${q(expected)}.`
            : `You might be mixing up ${q(expected)} and ${q(heard)}.`;
      return `${lead} Point to the word and say it slowly.`;
    }
    case 'missing_pause':
      return said === 'state'
        ? 'You did not stop at the full stops. Take a small breath at each one.'
        : 'You might be reading past some full stops. Take a small breath at each one.';
  }
}

export function standardParentLine(p: PatternFacts, said: Said): string {
  const ex = pickExample(p);
  switch (p.kind) {
    case 'dropped_ending': {
      const lead =
        said === 'state'
          ? `Your child often left off the ${q(`-${p.key}`)} ending`
          : `Your child may sometimes leave off the ${q(`-${p.key}`)} ending`;
      return `${lead}${parentExample(ex)}. ${parentCounts(p, `a word ended in ${q(`-${p.key}`)}`)}`;
    }
    case 'letter_pattern': {
      const lead =
        said === 'state'
          ? `Your child often had trouble with the letters ${q(p.key)}`
          : `Your child may have some trouble with the letters ${q(p.key)}`;
      return `${lead}${parentExample(ex)}. ${parentCounts(p, 'those letters came up')}`;
    }
    case 'repeated_substitution': {
      const { expected, heard } = substitution(p);
      const lead =
        heard === null
          ? said === 'state'
            ? `Your child often had trouble with the word ${q(expected)}`
            : `Your child may have some trouble with the word ${q(expected)}`
          : said === 'state'
            ? `Your child often read ${q(expected)} as ${q(heard)}`
            : `Your child may be mixing up ${q(expected)} and ${q(heard)}`;
      return `${lead}. ${parentCounts(p, `${q(expected)} came up`)}`;
    }
    case 'missing_pause': {
      const after = ex ? `, for example after ${q(ex.expected)}` : '';
      const lead =
        said === 'state'
          ? `Your child often read on without pausing at full stops${after}`
          : `Your child may sometimes read on without pausing at full stops${after}`;
      return `${lead}. ${parentCounts(p, 'a sentence ended')}`;
    }
  }
}

export interface StandardExplanation {
  /** For "What your teacher noticed" (canvas B4). */
  child: string;
  parent: string;
}

/**
 * Child and parent notes in standard wording, each ending with the line that says how sure it is.
 * Low-confidence patterns are left out. Choosing which patterns to explain is the caller's job.
 */
export function standardExplanation(patterns: PatternFacts[]): StandardExplanation {
  const shown = patterns.flatMap((p) => {
    const phrasing = phrasingFor(p.confidence);
    return phrasing === 'leave_out' ? [] : [{ p, said: phrasing }];
  });
  const confidences = shown.map(({ p }) => p.confidence);
  return {
    child: [
      ...shown.map(({ p, said }) => standardChildLine(p, said)),
      surenessLine(confidences, 'child'),
    ].join(' '),
    parent: [
      ...shown.map(({ p, said }) => standardParentLine(p, said)),
      surenessLine(confidences, 'parent'),
    ].join(' '),
  };
}
