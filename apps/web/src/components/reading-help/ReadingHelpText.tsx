'use client';

import { ReadingRuler } from '@basabridge/ui';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useReadingHelp } from './ReadingHelpProvider';

/**
 * Wraps story text. Text size and spacing already follow the page. This adds the reading
 * ruler when the learner turned it on. The story screens (BB-32) use it around the story.
 */
export function ReadingHelpText({ children, label }: { children: ReactNode; label?: string }) {
  const t = useTranslations('readingHelp.ruler');
  const { state } = useReadingHelp();
  if (!state.readingRuler) return <div className="bb-readtext">{children}</div>;
  return (
    <ReadingRuler label={label ?? t('story')} previousLabel={t('previous')} nextLabel={t('next')}>
      {children}
    </ReadingRuler>
  );
}
