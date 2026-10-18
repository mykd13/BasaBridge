import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { lessonHref } from '../../server/learn/return-path';

/** Where the quiz comes back to. It is on the return allow-list. */
export const QUESTIONS_PATH = '/read/questions';

/**
 * The small link under a wrong answer (C2). It goes in the question screen's `learnSlot`, and only
 * when the server said `AnswerFeedback.learnOffer` is true. The server counts offers per quiz, so
 * the browser never decides how many a quiz gets.
 */
export function LearnAboutThisLink({
  lessonId,
  returnTo = QUESTIONS_PATH,
}: {
  lessonId: string;
  returnTo?: string;
}) {
  const t = useTranslations();
  return (
    <Link className="bb-learnlink" href={lessonHref(lessonId, returnTo)}>
      {t('learn.link.aboutThis')}
    </Link>
  );
}
