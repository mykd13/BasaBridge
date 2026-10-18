import { ButtonLink, Card, Notice } from '@basabridge/ui';
import { useFormatter, useTranslations } from 'next-intl';
import type { LinkedChild, PrivacyView, ScreenState } from '@/server/parent/types';
import { CARD, PARENT_TIME_ZONE } from './format';
import { ScreenFrame } from './ScreenFrame';

function Child({ child }: { child: LinkedChild }) {
  const t = useTranslations();
  const format = useFormatter();
  const sections = format.list(child.sharing.map((section) => t(`parent.sections.${section}`)));
  const linked = format.dateTime(new Date(child.linkedAt), {
    dateStyle: 'medium',
    timeZone: PARENT_TIME_ZONE,
  });
  return (
    <li>
      <Card as={CARD.article}>
        <h3>{child.label}</h3>
        <p>
          {child.sharing.length > 0
            ? t('parent.privacy.children.sharing', { sections })
            : t('parent.privacy.children.sharingNone')}
        </p>
        <p className="bb-parent__muted">
          {t('parent.privacy.children.linked', { date: linked })}
          {' · '}
          {t(`parent.privacy.children.${child.microphone}`)}
        </p>
      </Card>
    </li>
  );
}

export function PrivacyScreen({ state }: { state: ScreenState<PrivacyView> }) {
  const t = useTranslations();
  return (
    <ScreenFrame screen="privacy" state={state}>
      {(data) => (
        <>
          <section className="bb-parent__section" aria-labelledby="bb-children">
            <h2 id="bb-children">{t('parent.privacy.children.title')}</h2>
            <ul className="bb-parent__list">
              {data.children.map((child) => (
                <Child key={child.id} child={child} />
              ))}
            </ul>
            <p className="bb-parent__muted">{t('parent.privacy.children.own')}</p>
            <div>
              <ButtonLink href="/parent/link" variant="secondary" size="md">
                {t('parent.privacy.children.link')}
              </ButtonLink>
            </div>
            <Notice tone="warn" title={t('parent.privacy.actionsNotReady.title')}>
              <p>{t('parent.privacy.actionsNotReady.body')}</p>
            </Notice>
          </section>

          <section className="bb-parent__section" aria-labelledby="bb-voice">
            <h2 id="bb-voice">{t('parent.privacy.voice.title')}</h2>
            <p>{t('parent.privacy.voice.one')}</p>
            <p>{t('parent.privacy.voice.two')}</p>
          </section>

          <section className="bb-parent__section" aria-labelledby="bb-data">
            <h2 id="bb-data">{t('parent.privacy.data.title')}</h2>
            <p>
              <strong>{t('parent.privacy.data.whoLabel')}</strong> {t('parent.privacy.data.who')}
            </p>
            <p>
              <strong>{t('parent.privacy.data.aiLabel')}</strong> {t('parent.privacy.data.ai')}
            </p>
            <p>
              <strong>{t('parent.privacy.data.ownLabel')}</strong> {t('parent.privacy.data.own')}
            </p>
          </section>
        </>
      )}
    </ScreenFrame>
  );
}
