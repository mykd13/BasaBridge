'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import './parent.css';

const SECTIONS = [
  { slug: '', key: 'progress' },
  { slug: '/readings', key: 'readings' },
  { slug: '/levels', key: 'levels' },
  { slug: '/decisions', key: 'decisions' },
  { slug: '/privacy', key: 'privacy' },
] as const;

/** The links between a child's parent screens. It holds no learner data, so it renders before any read. */
export function SectionNav({ learner }: { learner: string }) {
  const t = useTranslations();
  const pathname = usePathname();
  const base = `/parent/${encodeURIComponent(learner)}`;
  return (
    <nav className="bb-subnav" aria-label={t('parent.nav.label')}>
      {SECTIONS.map(({ slug, key }) => {
        const href = `${base}${slug}`;
        return (
          <Link
            key={key}
            href={href}
            className="bb-subnav__item"
            aria-current={pathname === href ? 'page' : undefined}
          >
            {t(`parent.nav.${key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
