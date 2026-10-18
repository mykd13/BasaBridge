import { BookOpen } from '@basabridge/ui/icons';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonClassName, Card } from '@basabridge/ui';
import type { Lesson } from '@basabridge/learn';
import { lessonHref } from '../../server/learn/return-path';
import { currentLearnerId } from '../../server/learn/learner';
import { learnPort } from '../../server/learn/live';

export const RESULT_PATH = '/read/result';

const ASIDE = { as: 'aside' } as const;

type Teach = { lesson: Lesson; misses: number };

/** The Learn button and "What Learn will teach" (H1). It goes in the result screen's `learnSlot`. */
export function LearnResultPanelView({ lessons }: { lessons: Teach[] }) {
  const t = useTranslations();
  const first = lessons[0];
  if (!first) return null;
  return (
    <div className="bb-learnpanel">
      <div className="bb-learnpanel__actions">
        <Link
          className={buttonClassName({ variant: 'primary', size: 'lg' })}
          href={lessonHref(first.lesson.id, RESULT_PATH)}
        >
          <BookOpen size={26} aria-hidden="true" />
          {t('learn.result.learnButton')}
        </Link>
        <Link className={buttonClassName({ variant: 'secondary', size: 'lg' })} href="/read">
          {t('learn.result.readNew')}
        </Link>
      </div>
      <Card {...ASIDE} aria-labelledby="learn-teach-title">
        <h2 id="learn-teach-title">{t('learn.result.teachTitle')}</h2>
        <ul className="bb-learnpanel__list">
          {lessons.map(({ lesson, misses }) => {
            const skill = t(`learn.subject.${lesson.subject}`);
            return (
              <li key={lesson.id}>
                <strong>{lesson.title}</strong>
                <span>
                  {misses > 0
                    ? t('learn.result.reason', { count: misses, skill })
                    : t('learn.result.reasonNoCount', { skill })}
                </span>
              </li>
            );
          })}
        </ul>
        <p>{t('learn.result.note')}</p>
      </Card>
    </div>
  );
}

/** Server side: asks the port what this result offers. Renders nothing when there is no offer. */
export async function LearnResultPanel({ sessionId }: { sessionId: string }) {
  const offer = await learnPort().resultOffer(await currentLearnerId(), sessionId);
  if (!offer.onResult) return null;
  return <LearnResultPanelView lessons={offer.lessons} />;
}
