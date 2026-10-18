import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Chip } from '@basabridge/ui';
import { LEARN_RULES } from '@basabridge/learn';
import type { LessonCardData } from '../../server/learn/port';
import { lessonHref } from '../../server/learn/return-path';
import { STATUS_TONE, statusKeyFor } from './skill';

export function LessonCardView({ card }: { card: LessonCardData }) {
  const t = useTranslations();
  const status = statusKeyFor(card.status);
  const note =
    status === 'learned'
      ? t('learn.card.learned')
      : status === 'waitingForStory'
        ? t('learn.card.waiting', { count: LEARN_RULES.recheckItemsInNextStory })
        : card.lesson.goal;
  return (
    <Link
      className="bb-lessoncard"
      href={lessonHref(card.lesson.id)}
      aria-label={t('learn.card.open', { title: card.lesson.title })}
    >
      <Chip tone={STATUS_TONE[status]}>{t(`learn.status.${status}`)}</Chip>
      <strong>{card.lesson.title}</strong>
      <span>{note}</span>
    </Link>
  );
}
