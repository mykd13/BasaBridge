import { redirect } from 'next/navigation';

/** The Parent account menu item. Until BB-9 lists linked children, it opens the link screen (F1). */
export default function ParentHome() {
  redirect('/parent/link');
}
