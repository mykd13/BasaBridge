import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { withIntl } from '@/i18n/test-intl';

vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
}));
vi.mock('./learner', () => ({
  requireLearner: async () => '00000000-0000-4000-8000-000000000001',
}));
vi.mock('./actions', () => ({
  finishTryAction: vi.fn(),
  markMisheardAction: vi.fn(),
  submitAnswerAction: vi.fn(),
  startPlacementStoryAction: vi.fn(),
  deferPlacementAction: vi.fn(),
}));
vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));

const { setStudentData, resetStudentData } = await import('./data');
const fx = await import('./test-fixtures');

const home = (await import('@/app/(student)/(main)/home/page')).default;
const read = (await import('@/app/(student)/(main)/read/page')).default;
const analysis = (await import('@/app/(student)/(main)/read/analysis/page')).default;
const questions = (await import('@/app/(student)/(main)/read/questions/page')).default;
const result = (await import('@/app/(student)/(main)/read/result/page')).default;
const levelUp = (await import('@/app/(student)/(main)/read/level-up/page')).default;
const placement = (await import('@/app/(student)/placement/page')).default;
const placementNext = (await import('@/app/(student)/placement/next/page')).default;
const placementResult = (await import('@/app/(student)/placement/result/page')).default;

const html = (node: React.ReactNode) => renderToStaticMarkup(withIntl(node));
const noSearch = Promise.resolve({});

afterEach(resetStudentData);

describe('screens start empty until the engine answers (rule 8)', () => {
  it('every route shows the not ready state, never sample data', async () => {
    const pages = [
      await home(),
      await read({ searchParams: noSearch }),
      await analysis(),
      await questions(),
      await result(),
      await levelUp(),
      await placement(),
      await placementNext(),
      await placementResult(),
    ];
    for (const page of pages) {
      const out = html(page);
      expect(out).toContain('This part is not ready yet');
      expect(out).not.toMatch(/Level \d|\d+%/);
    }
  });

  it('shows the nothing yet state with a way to start when there is no result', async () => {
    setStudentData(fx.fakeStudentData({ getResult: async () => ({ ok: false, reason: 'none' }) }));
    const out = html(await result());
    expect(out).toContain('Nothing to show yet');
    expect(out).toContain('href="/read"');
  });
});

describe('one reading session, start to finish', () => {
  it('walks home, read, analysis, questions, result and level up on real shapes', async () => {
    setStudentData(fx.fakeStudentData());
    expect(html(await home())).toContain('of 100');
    expect(html(await read({ searchParams: noSearch }))).toContain('Read the story out loud');
    expect(html(await analysis())).toContain('You read to the end!');
    expect(html(await questions())).toContain('Able to wait calmly');
    expect(html(await result())).toContain('You answered 4 of 5');
    expect(html(await levelUp())).toContain('What is new at Level 25');
  });

  it('shows tries used up instead of the microphone when the server says so', async () => {
    setStudentData(
      fx.fakeStudentData({ getReading: async () => ({ ok: true, data: fx.triesUsed }) }),
    );
    const out = html(await read({ searchParams: noSearch }));
    expect(out).toContain('You used all 3 tries');
    expect(out).not.toContain('Turn on microphone');
  });

  it('passes the stop early choice to the server and ignores anything else', async () => {
    const seen: unknown[] = [];
    setStudentData(
      fx.fakeStudentData({
        getReading: async (_id, opts) => {
          seen.push(opts.mode);
          return { ok: true, data: fx.reading };
        },
      }),
    );
    await read({ searchParams: Promise.resolve({ from: 'rest' }) });
    await read({ searchParams: Promise.resolve({ from: 'top' }) });
    await read({ searchParams: Promise.resolve({ from: 'evil' }) });
    expect(seen).toEqual(['rest', 'top', undefined]);
  });

  it('shows stopped early when the try did not reach the end', async () => {
    setStudentData(
      fx.fakeStudentData({ getAnalysis: async () => ({ ok: true, data: fx.stoppedEarly }) }),
    );
    expect(html(await analysis())).toContain('We heard you stop at');
  });

  it('sends the learner to the result once every question is answered', async () => {
    setStudentData(
      fx.fakeStudentData({ getQuestion: async () => ({ ok: true, data: { status: 'complete' } }) }),
    );
    await expect(questions()).rejects.toThrow('REDIRECT:/read/result');
  });

  it('never puts the story on the questions page', async () => {
    setStudentData(fx.fakeStudentData());
    const out = html(await questions());
    expect(out).not.toContain(fx.reading.text);
    expect(out).not.toContain(fx.reading.title);
  });
});

describe('placement flow', () => {
  it('shows the screen for the step the server says, and redirects from the others', async () => {
    setStudentData(
      fx.fakeStudentData({ getPlacementStep: async () => ({ ok: true, data: fx.placementIntro }) }),
    );
    expect(html(await placement())).toContain('Let us find your starting level');
    await expect(placementNext()).rejects.toThrow('REDIRECT:/placement');
    await expect(placementResult()).rejects.toThrow('REDIRECT:/placement');

    setStudentData(
      fx.fakeStudentData({
        getPlacementStep: async () => ({ ok: true, data: fx.placementBetween }),
      }),
    );
    await expect(placement()).rejects.toThrow('REDIRECT:/placement/next');
    expect(html(await placementNext())).toContain('Nice reading! One more story.');

    setStudentData(
      fx.fakeStudentData({
        getPlacementStep: async () => ({ ok: true, data: fx.placementResult }),
      }),
    );
    await expect(placement()).rejects.toThrow('REDIRECT:/placement/result');
    expect(html(await placementResult())).toContain('This is a good place to start.');
  });
});
