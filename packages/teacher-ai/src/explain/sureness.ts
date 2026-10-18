/**
 * How sure a note is, decided by code from the confidence labels. The model never writes or
 * changes these lines; code adds them to every note, AI or standard.
 */
import type { Audience, Confidence, Phrasing } from './types';

export function phrasingFor(confidence: Confidence): Phrasing {
  if (confidence === 'high') return 'state';
  if (confidence === 'medium') return 'possible';
  return 'leave_out';
}

/**
 * The confidence a whole note can claim: the weakest pattern it mentions, so one sure pattern
 * never makes a guess sound sure. Null when nothing is clear enough to mention.
 */
export function noteConfidence(confidences: Confidence[]): 'medium' | 'high' | null {
  const shown = confidences.filter((c) => phrasingFor(c) !== 'leave_out');
  if (shown.length === 0) return null;
  return shown.includes('medium') ? 'medium' : 'high';
}

export const SURENESS_LINES: Record<Audience, Record<'high' | 'medium' | 'none', string>> = {
  child: {
    high: 'I am fairly sure about this.',
    medium: 'This is an early guess. I will keep listening.',
    none: 'I did not hear anything clear to work on yet. Keep reading!',
  },
  parent: {
    high: 'How sure: fairly sure. The pattern was clear in the tries so far.',
    medium: 'How sure: not sure yet. Treat this as something to watch, not a finding.',
    none: 'How sure: nothing was clear enough to report. Unclear words were left out, not counted as mistakes.',
  },
};

/** The sentence that says how sure a note is. */
export function surenessLine(confidences: Confidence[], audience: Audience): string {
  return SURENESS_LINES[audience][noteConfidence(confidences) ?? 'none'];
}
