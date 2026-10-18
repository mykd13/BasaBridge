import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { messagesFor } from '../../i18n/messages';
import { LESSON_FILES } from '../../server/learn/fixtures';
import type { LearnHomeData } from '../../server/learn/port';
import { createRegistry } from '@basabridge/learn';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { LearnAboutThisLink } = await import('./LearnAboutThisLink');
const { LearnHomeView } = await import('./LearnHomeView');
const { LearnResultPanelView } = await import('./LearnResultPanel');
const { LessonWalkthrough } = await import('./LessonWalkthrough');
const { LessonDoneView } = await import('./LessonDoneView');
const { practiceStepIndex, resumeAt, teachSteps } = await import('./steps');

const en = messagesFor('en', 'standard');
const html = (el: ReactElement) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      {el}
    </NextIntlClientProvider>,
  );

const registry = createRegistry(LESSON_FILES);
const lesson = registry.get('why-did-it-happen')!;
const other = registry.get('say-it-slowly')!;

describe('Learn home', () => {
  it('explains how lessons appear when there are none, with no placeholder lessons', () => {
    const out = html(<LearnHomeView home={{ recommended: [], bySkill: [] }} />);
    expect(out).toContain(en.learn.empty);
    expect(out).not.toContain('bb-lessoncard');
    expect(out).not.toContain(en.learn.recommended);
  });

  it('shows recommended lessons first, then lessons by skill with status chips', () => {
    const home: LearnHomeData = {
      recommended: [{ lesson, status: 'new' }],
      bySkill: [
        { subject: 'cause_effect', cards: [{ lesson, status: 'new' }] },
        { subject: 'decoding', cards: [{ lesson: other, status: 'waiting_for_story' }] },
      ],
    };
    const out = html(<LearnHomeView home={home} />);
    expect(out.indexOf(en.learn.recommended)).toBeLessThan(out.indexOf(en.learn.group.inferential));
    expect(out).toContain(en.learn.group.decoding);
    expect(out).toContain(en.learn.status.new);
    expect(out).toContain(en.learn.status.waitingForStory);
    expect(out).not.toContain(en.learn.status.learned);
  });

  it('labels a learned lesson Learned with its own wording', () => {
    const out = html(
      <LearnHomeView
        home={{
          recommended: [],
          bySkill: [{ subject: 'decoding', cards: [{ lesson: other, status: 'learned' }] }],
        }}
      />,
    );
    expect(out).toContain(en.learn.status.learned);
    expect(out).toContain(en.learn.card.learned);
  });
});

describe('Learn about this link', () => {
  it('returns to the questions after the lesson', () => {
    expect(html(<LearnAboutThisLink lessonId="why-did-it-happen" />)).toContain(
      'href="/learn/why-did-it-happen?return=%2Fread%2Fquestions"',
    );
  });

  it('drops a return path that is not on the allow-list', () => {
    const out = html(
      <LearnAboutThisLink lessonId="why-did-it-happen" returnTo="https://evil.example" />,
    );
    expect(out).toContain('href="/learn/why-did-it-happen"');
    expect(out).not.toContain('evil');
  });
});

describe('Learn result panel', () => {
  it('has the Learn button, a new story and what Learn will teach', () => {
    const out = html(<LearnResultPanelView lessons={[{ lesson, misses: 2 }]} />);
    expect(out).toContain(en.learn.result.learnButton);
    expect(out).toContain(en.learn.result.readNew);
    expect(out).toContain('You missed 2 questions about why things happen.');
    expect(out).toContain(en.learn.result.note);
  });

  it('shows nothing without a lesson', () => {
    expect(html(<LearnResultPanelView lessons={[]} />)).toBe('');
  });
});

describe('lesson steps', () => {
  it('walks the explain and example steps and finds the practice step', () => {
    expect(teachSteps(lesson).map((s) => s.index)).toEqual([0, 1]);
    expect(practiceStepIndex(lesson)).toBe(2);
  });

  it('puts a saved position back where the learner left', () => {
    expect(resumeAt(lesson, { step: 0, item: 0 })).toEqual({ screen: 'teach', teachIndex: 0 });
    expect(resumeAt(lesson, { step: 1, item: 0 })).toEqual({ screen: 'teach', teachIndex: 1 });
    expect(resumeAt(lesson, { step: 2, item: 1 })).toEqual({ screen: 'practice', item: 1 });
  });

  it('opens the lesson on the restored step', () => {
    const props = {
      lessonId: lesson.id,
      title: lesson.title,
      goal: lesson.goal,
      group: en.learn.group.inferential,
      steps: teachSteps(lesson),
      practiceStep: 2,
      returnTo: null,
      savePosition: async () => {},
    };
    const first = html(<LessonWalkthrough {...props} initialIndex={0} />);
    expect(first).toContain('Look for because');
    const second = html(<LessonWalkthrough {...props} initialIndex={1} />);
    expect(second).toContain('It rained, so Mia stayed home.');
    expect(second).not.toContain('Look for because');
  });
});

describe('Lesson done', () => {
  it('says the check comes in the next story and practice does not change the level', () => {
    const out = html(
      <LessonDoneView title="Why did it happen?" recheckItems={2} returnTo={null} />,
    );
    expect(out).toContain('You finished: Why did it happen?');
    expect(out).toContain('read a new story');
    expect(out).toContain('2 questions');
    expect(out).toContain('Practice here does not change your level.');
  });
});
