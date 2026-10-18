/**
 * Shapes for the reading-pattern explanation (BB-28). The first three mirror the BB-27 shapes in
 * @basabridge/contracts (PatternConfidence, ReadingPatternKind, PatternExample). They are swapped
 * for the contract types once BB-27 is on main, so they must not drift from it.
 */

/** How sure code is that a pattern is real. Computed in code, never by the AI. */
export type Confidence = 'low' | 'medium' | 'high';

export type PatternKind =
  'dropped_ending' | 'letter_pattern' | 'repeated_substitution' | 'missing_pause';

/** One word-level example. Words from the story and the speech result only: no names, no audio. */
export interface WordPair {
  expected: string;
  heard: string | null;
}

/** What a note may say about one pattern. Words only, from code. */
export interface PatternFacts {
  kind: PatternKind;
  /** An ending ("ing"), letters ("th"), a pair ("was>saw") or "full_stop". */
  key: string;
  count: number;
  opportunities: number;
  confidence: Confidence;
  examples: WordPair[];
}

/** Low patterns are left out, medium ones are said as a possibility, high ones are stated. */
export type Phrasing = 'leave_out' | 'possible' | 'state';

export type Audience = 'child' | 'parent';
