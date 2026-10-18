import { useTranslations } from 'next-intl';

/** The BasaBridge mark and name, drawn as on the canvas headers. */
export function Logo() {
  const t = useTranslations('app');
  return (
    <span className="bb-logo">
      <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true">
        <rect width="40" height="40" rx="10" fill="var(--accent)" />
        <path
          d="M5 27h30M8 27c0-8 5-12 12-12s12 4 12 12M14 27v-6M20 27v-12M26 27v-6"
          fill="none"
          stroke="var(--accent-ink)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      {t('name')}
    </span>
  );
}
