import { tierFor, triesFor } from '@basabridge/levels';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitch } from '../components/LanguageSwitch.tsx';

/**
 * Placeholder landing page. Replace with the sign-in screen (design/canvas A1) in BB-12.
 * It reads the level table only to prove the workspace packages resolve end to end.
 */
export default async function Home() {
  const t = await getTranslations();
  const level = 1;
  const first = tierFor(level);
  const tries = triesFor(level);
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 40 }}>{t('app.name')}</h1>
      <p style={{ color: 'var(--muted)' }}>{t('app.tagline')}</p>
      <p style={{ color: 'var(--muted)', fontSize: 15 }}>
        {t('home.levelOne', {
          level,
          min: first.words.min,
          max: first.words.max,
          tries: tries === null ? t('home.triesUnlimited') : t('home.tries', { count: tries }),
        })}
      </p>
      <LanguageSwitch />
    </main>
  );
}
