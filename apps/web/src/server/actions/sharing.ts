'use server';

import type { FormState } from '@/lib/account-forms';

/**
 * Sharing with a parent (BB-9, BB-10). The link code, the share switches and "stop sharing" need
 * the authorization layer, which is not merged yet. Until it is, each action says so plainly
 * and changes nothing. They never read or write learner tables directly (AGENTS rule 4).
 * When BB-9 and BB-10 land, replace the bodies and keep the signatures.
 */
const NOT_WIRED: FormState = { error: 'notWired' };

export async function makeLinkCodeAction(_prev: FormState): Promise<FormState> {
  return NOT_WIRED;
}

export async function setShareFlagAction(_prev: FormState, _data: FormData): Promise<FormState> {
  return NOT_WIRED;
}

export async function stopSharingAction(_prev: FormState): Promise<FormState> {
  return NOT_WIRED;
}

export async function linkChildAction(_prev: FormState, _data: FormData): Promise<FormState> {
  return NOT_WIRED;
}
