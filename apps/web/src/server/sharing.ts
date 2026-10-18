import type { ShareLink } from '@/components/account/ShareControls';

export type ShareState =
  { wired: false } | { wired: true; code: string | null; links: ShareLink[] };

/**
 * What Share with a parent shows. The link code and the links come from the authorization layer
 * (BB-9, BB-10), which is not merged yet, so nothing is read and nothing is invented here.
 * When it lands, return `{ wired: true, ... }` from its functions and the screen fills in.
 */
export async function loadShareState(): Promise<ShareState> {
  return { wired: false };
}
