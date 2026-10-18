import { Card, Notice } from '@basabridge/ui';
import { useTranslations } from 'next-intl';
import { AccountPage } from '@/components/account/AccountPage';
import { LinkCodePanel, LinkedParent } from '@/components/account/ShareControls';
import { loadShareState, type ShareState } from '@/server/sharing';

function Share({ state }: { state: ShareState }) {
  const t = useTranslations();
  const links = state.wired ? state.links : [];
  return (
    <AccountPage>
      <h1>{t('account.share.title')}</h1>
      <p>{t('account.share.intro')}</p>
      {state.wired ? null : (
        <Notice tone="warn">
          <p>{t('account.state.notWired')}</p>
        </Notice>
      )}
      <LinkCodePanel code={state.wired ? state.code : null} />
      <Card>
        <h2>{t('account.share.seeTitle')}</h2>
        <ul className="bb-account__list">
          <li>
            <strong>{t('account.share.seeProgress')}</strong>
            <br />
            {t('account.share.seeProgressBody')}
          </li>
          <li>
            <strong>{t('account.share.seeAnalysis')}</strong>
            <br />
            {t('account.share.seeAnalysisBody')}
          </li>
          <li>
            <strong>{t('account.share.voiceNever')}</strong>
            <br />
            {t('account.share.voiceNeverBody')}
          </li>
        </ul>
      </Card>
      <h2>{t('account.share.linkedTitle')}</h2>
      {links.length === 0 ? (
        <p className="bb-account__muted">{t('account.share.linkedEmpty')}</p>
      ) : (
        links.map((link) => <LinkedParent key={link.id} link={link} />)
      )}
    </AccountPage>
  );
}

/** Share with a parent (E3). Learners choose; nothing is shared until they make a code. */
export default async function Page() {
  return <Share state={await loadShareState()} />;
}
