import { NotWiredError } from '@/server/errors';
import type { ShareSection } from './types';

export interface ShareGrant {
  /** True when the student shares this section with the signed-in parent. */
  shared: boolean;
}

/**
 * The one door to learner data for parent pages (AGENTS.md rule 4).
 * Stub until BB-10 lands. It will check the parent link and the student's sharing switch
 * for `section`, and the loaders read nothing before it answers.
 */
export async function authorizeParentRead(
  _learner: string,
  section: ShareSection,
): Promise<ShareGrant> {
  throw new NotWiredError(`BB-10 authorization for parent ${section}`);
}

/** The parent's own linked children and sharing. Stub until BB-10 and BB-9. */
export async function authorizeParentAccount(): Promise<void> {
  throw new NotWiredError('BB-10 authorization for the parent account');
}
