/**
 * Retry loop around the deterministic checks (docs/PLAN.md section 7, BB-16).
 * The feedback text goes back to a model, so it is built only from failure codes, counts and the
 * level's limits. It never repeats the passage, a question, a learner field or anything a model wrote.
 */
import type { CheckFailure } from './checks';

/** What retry feedback needs from a failure. A CheckFailure fits, and so do generation failures. */
export type FeedbackItem = Pick<CheckFailure, 'message' | 'questionIndex'>;

/** Tries to get a story that passes the checks. A pipeline setting, not a level rule. */
export const MAX_STORY_TRIES = 3;

/** The most problems listed in one retry message. Keeps the prompt short. */
const MAX_FEEDBACK_LINES = 8;

/**
 * Turns check failures into short instructions for the next try. Story-level failures carry their
 * own message (counts and limits only). Question-level failures use the question number and the
 * check's fixed wording.
 */
export function failureFeedback(failures: readonly FeedbackItem[]): string {
  const lines: string[] = [];
  for (const f of failures) {
    const line =
      f.questionIndex === undefined ? f.message : `Question ${f.questionIndex + 1}: ${f.message}`;
    if (!lines.includes(line)) lines.push(line);
  }
  if (lines.length === 0) return '';
  const shown = lines.slice(0, MAX_FEEDBACK_LINES).map((l) => `- ${l}`);
  const more = lines.length - shown.length;
  if (more > 0) shown.push(`- ${more} more problems.`);
  return ['The last try failed these checks. Fix them and write the story again.', ...shown].join(
    '\n',
  );
}

type Checked = { ok: true } | { ok: false; failures: FeedbackItem[] };
/** The failure list type of a check result, so callers keep their own failure codes. */
type Failures<C> = Extract<C, { ok: false }>['failures' & keyof Extract<C, { ok: false }>];

export interface RunWithChecksInput<T, C extends Checked> {
  /** Produces one candidate. Gets the feedback from the previous failed try, if any. */
  attempt: (retryReason?: string) => Promise<T>;
  /** Runs the deterministic checks on a candidate. */
  check: (candidate: T) => C;
  /** Defaults to MAX_STORY_TRIES. */
  maxTries?: number;
}

export type RunWithChecksResult<T, C extends Checked> =
  | { ok: true; value: T; checked: Extract<C, { ok: true }>; tries: number }
  | { ok: false; failures: Failures<C>; tries: number };

/**
 * Calls `attempt` until a candidate passes `check`, up to `maxTries`. After the last failed try it
 * returns the last failures, so the caller can fail visibly. Errors thrown by `attempt` are not
 * caught here.
 */
export async function runWithChecks<T, C extends Checked>({
  attempt,
  check,
  maxTries = MAX_STORY_TRIES,
}: RunWithChecksInput<T, C>): Promise<RunWithChecksResult<T, C>> {
  const limit = Math.max(1, Math.floor(maxTries));
  let retryReason: string | undefined;
  let failures: FeedbackItem[] = [];
  for (let tries = 1; tries <= limit; tries++) {
    const value = await attempt(retryReason);
    const checked = check(value);
    if (checked.ok) return { ok: true, value, checked: checked as Extract<C, { ok: true }>, tries };
    failures = checked.failures;
    retryReason = failureFeedback(failures) || undefined;
  }
  return { ok: false, failures: failures as Failures<C>, tries: limit };
}
