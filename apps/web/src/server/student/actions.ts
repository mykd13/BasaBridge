'use server';

import { AnswerSubmission } from '@basabridge/contracts';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSessionUser } from '../session';
import type { AnswerFeedback, TryFinish } from './schemas';
import { student } from './data';

/**
 * Server actions the student screens call. Each one reads the learner from the session and
 * checks its input with zod, so nothing from the browser is trusted (AGENTS.md rule 5).
 */

async function learnerId(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.role === 'student' ? user.id : null;
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false };

const failed = { ok: false } as const;

const TryInput = z.object({
  sessionId: z.string().uuid(),
  /** The try id the browser made for the upload: 32 hex characters (see newTryId). */
  tryId: z.string().regex(/^[0-9a-f]{32}$/),
  mode: z.enum(['audio', 'silent']),
});

/** The learner finished a reading. The server analyses it, counts the try and says where next. */
export async function finishTryAction(input: unknown): Promise<ActionResult<TryFinish>> {
  const id = await learnerId();
  const parsed = TryInput.safeParse(input);
  if (!id || !parsed.success) return failed;
  const result = await student.finishTry(id, parsed.data);
  return result.ok ? { ok: true, data: result.data } : failed;
}

/** The learner taps a word they say was read right. The server fixes it. */
export async function markMisheardAction(input: unknown): Promise<ActionResult<null>> {
  const id = await learnerId();
  const parsed = z.object({ index: z.number().int().nonnegative() }).safeParse(input);
  if (!id || !parsed.success) return failed;
  const result = await student.markMisheard(id, parsed.data);
  return result.ok ? { ok: true, data: null } : failed;
}

/** The learner picks an answer. The server scores it and returns what to show. */
export async function submitAnswerAction(input: unknown): Promise<ActionResult<AnswerFeedback>> {
  const id = await learnerId();
  const parsed = AnswerSubmission.safeParse(input);
  if (!id || !parsed.success) return failed;
  const result = await student.answer(id, parsed.data);
  return result.ok ? { ok: true, data: result.data } : failed;
}

/** Placement: begin, or go on to the next placement story. Then read. */
export async function startPlacementStoryAction(): Promise<{ ok: false }> {
  const id = await learnerId();
  if (!id) return failed;
  const result = await student.startPlacementStory(id);
  if (!result.ok) return failed;
  redirect('/read');
}

/** Placement: the learner chose to do it later. */
export async function deferPlacementAction(): Promise<{ ok: false }> {
  const id = await learnerId();
  if (!id) return failed;
  const result = await student.deferPlacement(id);
  if (!result.ok) return failed;
  redirect('/home');
}
