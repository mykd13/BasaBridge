import type { Metadata } from 'next';
import { getFlaggedWords } from '../../../lib/word-practice/flagged';
import { messagesFor, type Lang, type Wording } from '../../../lib/word-practice/messages';
import { SayIt } from './say-it';

export const metadata: Metadata = { title: 'Say it · BasaBridge' };
export const dynamic = 'force-dynamic';

/**
 * Word practice (canvas H6). Words are the learner's own flagged words, most recent first.
 * Language and wording come from the query until the learner settings can supply them.
 */
export default async function WordsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; wording?: string }>;
}) {
  const params = await searchParams;
  const lang: Lang = params.lang === 'fil' ? 'fil' : 'en';
  const wording: Wording = params.wording === 'simple' ? 'simple' : 'standard';
  const words = await getFlaggedWords();
  return <SayIt words={words} messages={messagesFor(lang, wording)} />;
}
