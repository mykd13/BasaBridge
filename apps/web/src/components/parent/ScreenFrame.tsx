import { BookOpen, Info } from '@basabridge/ui/icons';
import type { ReactNode } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { PageLoading } from '@/components/states/PageLoading';
import type { LearnerSummary, ScreenState } from '@/server/parent/types';
import { MAX_LEVEL } from '@basabridge/levels';
import { PARENT_TIME_ZONE } from './format';
import { ReloadButton } from './ReloadButton';
import './parent.css';

export type ParentScreen = 'progress' | 'readings' | 'levels' | 'decisions' | 'privacy';

export interface ScreenFrameProps<T> {
  screen: ParentScreen;
  state: ScreenState<T>;
  /** The line under the title, for screens that show it. */
  summary?: (data: T) => LearnerSummary;
  children: (data: T) => ReactNode;
}

function Summary({ summary }: { summary: LearnerSummary }) {
  const t = useTranslations();
  const format = useFormatter();
  const parts = [
    summary.grade === null ? null : t('parent.summary.grade', { grade: summary.grade }),
    t('parent.summary.level', { level: summary.level, max: MAX_LEVEL }),
    t('parent.summary.readings', { count: summary.readings }),
  ].filter((part): part is string => part !== null);
  const since = format.dateTime(new Date(summary.sharedSince), {
    dateStyle: 'medium',
    timeZone: PARENT_TIME_ZONE,
  });
  return (
    <>
      <p className="bb-parent__summary">{parts.join(' · ')}</p>
      <p className="bb-parent__muted">{t('parent.summary.sharedSince', { date: since })}</p>
    </>
  );
}

/**
 * The page body for one parent screen: the one h1, then whichever state the loader gave.
 * The shell already supplies the single <main>, so this renders none.
 */
export function ScreenFrame<T>({ screen, state, summary, children }: ScreenFrameProps<T>) {
  const t = useTranslations();
  const sectionName =
    screen === 'privacy' ? t('parent.titles.privacy') : t(`parent.sections.${screen}`);

  let body: ReactNode;
  switch (state.kind) {
    case 'loading':
      body = <PageLoading />;
      break;
    case 'empty':
      body = (
        <EmptyState
          icon={<BookOpen size={32} />}
          title={t('parent.states.emptyTitle')}
          body={t(`parent.states.empty.${screen}`)}
        />
      );
      break;
    case 'not-shared':
      body = (
        <EmptyState
          icon={<Info size={32} />}
          title={t('parent.states.notSharedTitle', { section: sectionName })}
          body={t('parent.states.notSharedBody')}
          action={<p className="bb-state__body">{t('parent.states.notSharedStep')}</p>}
        />
      );
      break;
    case 'not-wired':
      body = (
        <ErrorState
          tone="warn"
          title={t('errors.notWired.title')}
          body={t('errors.notWired.body')}
        />
      );
      break;
    case 'error':
      body = (
        <>
          <ErrorState title={t('parent.states.errorTitle')} body={t('parent.states.errorBody')} />
          <ReloadButton label={t('parent.states.retry')} />
        </>
      );
      break;
    case 'ready':
      body = children(state.data);
      break;
  }

  return (
    <div className="bb-parent">
      <header className="bb-parent__head">
        <h1 className="bb-parent__title">{t(`parent.titles.${screen}`)}</h1>
        {state.kind === 'ready' && summary ? <Summary summary={summary(state.data)} /> : null}
      </header>
      {body}
    </div>
  );
}
