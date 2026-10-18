import { buttonClassName, type ButtonStyleProps } from '@basabridge/ui';
import { BookOpen } from '@basabridge/ui/icons';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/states/EmptyState';
import './student.css';

/** A next/link that looks like a button. Use it for moves to another page. */
export function LinkButton({
  href,
  children,
  variant,
  size,
  icon,
  block,
}: ButtonStyleProps & { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClassName({ variant, size, block })}>
      {icon ? (
        <span className="bb-btn__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </Link>
  );
}

/**
 * What a screen shows when the server has nothing for it.
 * `unavailable` means the part is not wired yet or failed. `none` means there is no activity yet.
 * Never sample data (AGENTS.md rule 8).
 */
export function StudentEmpty({
  reason,
  body,
  action,
}: {
  reason: 'unavailable' | 'none';
  body?: string;
  action?: ReactNode;
}) {
  const t = useTranslations('student.common');
  return (
    <div className="bb-s-page bb-s-page--narrow">
      <EmptyState
        headingLevel={1}
        icon={<BookOpen size={32} />}
        title={reason === 'none' ? t('nothingTitle') : t('notReadyTitle')}
        body={body ?? t('notReadyBody')}
        action={action ?? <LinkButton href="/home">{t('homeLink')}</LinkButton>}
      />
    </div>
  );
}
