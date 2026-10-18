import { getTranslations } from 'next-intl/server';
import { LinkButton, StudentEmpty } from '@/components/student/common';
import { ResultScreen } from '@/components/student/ResultScreens';
import { titleFor } from '@/components/student/title';
import { student } from '@/server/student/data';
import { requireLearner } from '@/server/student/learner';

export const generateMetadata = () => titleFor('result.pageTitle');

export default async function Page() {
  const result = await student.result(await requireLearner());
  if (result.ok) return <ResultScreen result={result.data} />;
  const t = await getTranslations('student.result');
  const none = result.reason === 'none';
  return (
    <StudentEmpty
      reason={result.reason}
      body={none ? t('nothingBody') : undefined}
      action={none ? <LinkButton href="/read">{t('nothingAction')}</LinkButton> : undefined}
    />
  );
}
