/**
 * Content review for stories (docs/PLAN.md section 13, BB-42). Owner: Jhade.
 * Codes only. The words a learner or parent sees for each reason belong to the web app.
 * Reports and reviews carry story and question ids, never learner data.
 */

/** Why a learner or parent reported a story or one of its questions. No free text, by design. */
export const REPORT_REASONS = [
  'wrong_answer',
  'confusing_question',
  'too_hard',
  'not_safe',
  'something_else',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** What an educator checks on every story under review. To be confirmed with the reading specialist (BB-74). */
export const REVIEW_CHECKLIST = [
  { id: 'level_fit', label: 'Fits the level: length, words and sentences' },
  { id: 'child_safe', label: 'Safe and kind for children' },
  { id: 'respectful_setting', label: 'Philippine-relevant setting without stereotypes' },
  { id: 'questions_match_text', label: 'Every question can be answered from the story' },
  { id: 'one_correct_answer', label: 'Each question has exactly one correct option' },
  { id: 'clear_wording', label: 'Clear, natural wording' },
] as const;
export type ChecklistItem = (typeof REVIEW_CHECKLIST)[number]['id'];

export const REVIEW_ACTIONS = ['approve', 'fix', 'retire'] as const;
export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

export interface ReviewDecision {
  action: ReviewAction;
  /** Checklist items the story failed. */
  failed: ChecklistItem[];
}

export type ReviewDecisionResult = { ok: true } | { ok: false; reason: string };

const CHECKLIST_IDS = new Set<string>(REVIEW_CHECKLIST.map((c) => c.id));

/** Approve names no failed items. Fix and retire name at least one, so every change has a reason. */
export function checkReviewDecision(decision: ReviewDecision): ReviewDecisionResult {
  if (!REVIEW_ACTIONS.includes(decision.action)) {
    return { ok: false, reason: `Unknown review action: ${String(decision.action)}.` };
  }
  const unknown = decision.failed.filter((id) => !CHECKLIST_IDS.has(id));
  if (unknown.length > 0) {
    return { ok: false, reason: `Unknown checklist items: ${unknown.join(', ')}.` };
  }
  if (new Set(decision.failed).size !== decision.failed.length) {
    return { ok: false, reason: 'A checklist item is listed twice.' };
  }
  if (decision.action === 'approve' && decision.failed.length > 0) {
    return { ok: false, reason: 'An approved story cannot have failed checklist items.' };
  }
  if (decision.action !== 'approve' && decision.failed.length === 0) {
    return { ok: false, reason: `To ${decision.action} a story, name at least one failed item.` };
  }
  return { ok: true };
}
