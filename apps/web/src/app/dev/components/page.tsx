import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ComponentPreview } from './preview';

export const metadata: Metadata = {
  title: 'Components | BasaBridge',
  robots: { index: false, follow: false },
};

/** Developer preview of @basabridge/ui (BB-05). It does not exist in production builds. */
export default function ComponentsPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <ComponentPreview />;
}
