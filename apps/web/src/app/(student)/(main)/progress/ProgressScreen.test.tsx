import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RouteError } from '@/components/states/RouteError';
import { withIntl } from '@/i18n/test-intl';
import { isNotWired, NotWiredError } from '@/server/errors';
import { loadProgress, type ProgressView } from '@/server/progress/load-progress';
import PageLoadingRoute from './loading';
import ProgressError from './error';
import { ProgressScreen } from './ProgressScreen';

// Typed test data. It lives in tests only (AGENTS.md rule 8).
const filled: ProgressView = {
  level: 24,
  maxLevel: 100,
  next: { level: 25, progress: 0.67, storiesLeft: 1 },
  focusSkill: 'vocabulary',
  recent: [
    {
      id: 'a',
      title: 'The Mango Tree',
      finishedAt: new Date('2026-10-17T08:00:00Z'),
      triesUsed: 2,
      questionsCorrect: 4,
      questionsTotal: 5,
    },
    {
      id: 'b',
      title: 'The Market Day',
      finishedAt: new Date('2026-10-16T08:00:00Z'),
      triesUsed: 1,
      questionsCorrect: 5,
      questionsTotal: 5,
    },
  ],
};

const render = (
  node: React.ReactElement,
  lang: 'en' | 'fil' = 'en',
  wording: 'simple' | 'standard' = 'standard',
) => renderToStaticMarkup(withIntl(node, lang, wording));
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;

describe('ProgressScreen', () => {
  it('shows the level, progress to the next level, focus skill and recent stories', () => {
    const html = render(<ProgressScreen view={filled} />);
    expect(html).toContain('My level');
    expect(html).toContain('24');
    expect(html).toContain('of 100');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('1 more story to reach Level 25');
    expect(html).toContain('Word meanings');
    expect(html).toContain('The Mango Tree');
    expect(html).toContain('2 tries');
    expect(html).toContain('4 of 5');
    expect(html).toContain('Oct 17');
  });

  it('has one h1 and no main landmark of its own', () => {
    for (const view of [filled, null]) {
      const html = render(<ProgressScreen view={view} />);
      expect(count(html, /<h1[ >]/g)).toBe(1);
      expect(html).not.toContain('<main');
    }
  });

  it('shows the empty state for a learner with no finished story', () => {
    const html = render(<ProgressScreen view={null} />);
    expect(html).toContain('No stories yet');
    expect(html).toContain('href="/home"');
    expect(html).not.toContain('progressbar');
  });

  it('says so when there is no focus skill, no next level or no recent story', () => {
    const html = render(
      <ProgressScreen view={{ ...filled, next: null, focusSkill: null, recent: [] }} />,
    );
    expect(html).toContain('You are at the top level.');
    expect(html).toContain('pick a skill');
    expect(html).toContain('after you finish one');
    expect(html).not.toContain('progressbar');
  });

  it('renders in Filipino and in simple wording', () => {
    expect(render(<ProgressScreen view={filled} />, 'fil')).toContain('Aking antas');
    expect(render(<ProgressScreen view={filled} />, 'en', 'simple')).toContain(
      '1 more story to Level 25',
    );
    expect(render(<ProgressScreen view={null} />, 'fil')).toContain('Wala pang kuwento');
  });
});

describe('progress route states', () => {
  it('has a loading state', () => {
    const html = render(<PageLoadingRoute />);
    expect(html).toContain('aria-busy="true"');
  });

  it('is not wired until BB-10 and BB-19 land', async () => {
    await expect(loadProgress({ id: 'u', role: 'student' })).rejects.toBeInstanceOf(NotWiredError);
    await expect(loadProgress({ id: 'u', role: 'student' })).rejects.toSatisfy(isNotWired);
  });

  it('shows the not wired message under the page h1', () => {
    const html = render(<ProgressError error={new NotWiredError('x')} reset={() => {}} />);
    expect(count(html, /<h1[ >]/g)).toBe(1);
    expect(html).toContain('This part is not ready yet');
    expect(html).not.toContain('Try again');
  });

  it('shows a retry for any other error', () => {
    const html = render(<ProgressError error={new Error('boom')} reset={() => {}} />);
    expect(count(html, /<h1[ >]/g)).toBe(1);
    expect(html).toContain('Something went wrong');
    expect(html).toContain('Try again');
    expect(html).not.toContain('boom');
  });

  it('keeps the shared route error working', () => {
    expect(render(<RouteError error={new Error('x')} reset={() => {}} />)).toContain('Try again');
  });
});
