import type { ReactNode } from 'react';
import { requirePlacement } from '@/server/placement-gate';
import { getSessionUser } from '@/server/session';

/**
 * Holds the pages that need a finished placement: home, progress, read and learn.
 * Account, reading help and placement itself live beside this group, so they skip the gate.
 */
export default async function MainLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  // The parent layout already sent anyone but a learner away. This keeps the type honest.
  if (user) await requirePlacement(user);
  return children;
}
