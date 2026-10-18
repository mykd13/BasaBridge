import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { withIntl } from '@/i18n/test-intl';
import type { Lang, Wording } from '@/i18n/types';
import * as fx from '@/server/student/test-fixtures';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  redirect: vi.fn(),
}));
vi.mock('@/server/student/actions', () => ({
  finishTryAction: vi.fn(),
  markMisheardAction: vi.fn(),
  submitAnswerAction: vi.fn(),
  startPlacementStoryAction: vi.fn(),
  deferPlacementAction: vi.fn(),
}));

const { HomeScreen } = await import('./HomeScreen');
const { StudentEmpty } = await import('./common');
const { ReadSession } = await import('./ReadSession');
const { AnalysisScreen, StoppedEarlyScreen, TriesUsedScreen } = await import('./ReadingResults');
const { QuestionFlow } = await import('./QuestionFlow');
const { ResultScreen, LevelUpScreen } = await import('./ResultScreens');
const { PlacementIntro, PlacementBetween, PlacementResultScreen } =
  await import('./PlacementScreens');

const render = (node: React.ReactNode, lang: Lang = 'en', wording: Wording = 'standard') =>
  renderToStaticMarkup(withIntl(node, lang, wording));

describe('home (BB-31)', () => {
  it('shows the level, tries, progress and the teacher note from the server', () => {
    const out = render(<HomeScreen home={fx.home} />);
    expect(out).toContain('Hi, Test learner!');
    expect(out).toContain('24');
    expect(out).toContain('of 100');
    expect(out).toContain('5 tries on each story');
    expect(out).toContain('2 of 3 stories passed to reach Level 25.');
    expect(out).toContain('about 25 to 50 words');
    expect(out).toContain('You read the whole story smoothly last time.');
    expect(out).toContain('href="/read"');
    expect(out).toContain('href="/progress"');
  });

  it('starts empty: no note yet, no name, top level has no progress bar', () => {
    const out = render(
      <HomeScreen home={{ ...fx.home, displayName: null, note: null, progress: null }} />,
    );
    expect(out).toContain('Hi!');
    expect(out).toContain('Read a story and your teacher will leave you a note here.');
    expect(out).not.toContain('stories passed to reach');
  });

  it('says unlimited tries when the server sends none', () => {
    const out = render(<HomeScreen home={{ ...fx.home, triesPerStory: null }} />);
    expect(out).toContain('As many tries as you need on each story');
  });

  it('uses the simple wording and Filipino from the catalog', () => {
    expect(render(<HomeScreen home={fx.home} />, 'en', 'simple')).toContain('Read a story');
    const fil = render(<HomeScreen home={fx.home} />, 'fil');
    expect(fil).toContain('Kumusta, Test learner!');
    expect(fil).toContain('Magbasa ng bagong kuwento');
  });
});

describe('empty states', () => {
  it('says the part is not ready when the server cannot answer', () => {
    const out = render(<StudentEmpty reason="unavailable" />);
    expect(out).toContain('This part is not ready yet');
    expect(out).toContain('href="/home"');
  });

  it('says there is nothing yet when there is no activity', () => {
    expect(render(<StudentEmpty reason="none" />)).toContain('Nothing to show yet');
  });
});

describe('reading session (BB-32)', () => {
  it('starts on the microphone screen with the story not yet shown', () => {
    const out = render(<ReadSession reading={fx.reading} />);
    expect(out).toContain('Read the story out loud');
    expect(out).toContain('Turn on microphone');
    expect(out).toContain('I cannot use a microphone');
    expect(out).toContain('Level 24');
    expect(out).not.toContain(fx.reading.text);
  });

  it('reads silently when the server says the microphone is not allowed', () => {
    const out = render(<ReadSession reading={{ ...fx.reading, micAllowed: false }} />);
    expect(out).toContain('Read the story to yourself');
    expect(out).toContain('so you will read silently for now');
    expect(out).toContain(fx.reading.text);
    expect(out).not.toContain('Turn on microphone');
    expect(out).toContain('I finished reading');
  });

  it('shows the analysis with counts, pace, tries and the teacher notes', () => {
    const out = render(<AnalysisScreen analysis={fx.analysis} />);
    expect(out).toContain('You read to the end!');
    expect(out).toContain('52 of 55');
    expect(out).toContain('62 words a minute');
    expect(out).toContain('Try 2, best');
    expect(out).toContain('94%');
    expect(out).toContain('3 tries left on this story.');
    expect(out).toContain('Take a small breath at each full stop.');
    expect(out).toContain('patient');
    expect(out).toContain('Try again (3 left)');
    expect(out).toContain('href="/read/questions"');
  });

  it('lets the learner tap a word that was hard to hear', () => {
    const out = render(<AnalysisScreen analysis={fx.analysis} />);
    expect(out).toContain('I could not hear these words clearly');
    expect(out).toMatch(/<button[^>]*aria-label="Tap “tree” if you read it right"/);
  });

  it('offers no more tries when none are left, and warns when a try needs review', () => {
    const out = render(
      <AnalysisScreen
        analysis={{
          ...fx.analysis,
          triesLeft: 0,
          review: 'needs_review',
          conditions: ['low_volume'],
        }}
      />,
    );
    expect(out).toContain('No tries left on this story.');
    expect(out).not.toMatch(/Try again \(|>Try again</);
    expect(out).toContain('it will not count until it is checked');
  });

  it('shows where the learner stopped and both ways to carry on', () => {
    const out = render(<StoppedEarlyScreen analysis={fx.stoppedEarly} />);
    expect(out).toContain('We heard you stop at “sour”');
    expect(out).toContain('counts as try 2 of 5 only when you reach the end');
    expect(out).toContain('but they are too sour. Grandfather smiles.');
    expect(out).toContain('href="/read?from=rest"');
    expect(out).toContain('href="/read?from=top"');
  });

  it('shows the best try when every try is used', () => {
    const out = render(<TriesUsedScreen reading={fx.triesUsed} />);
    expect(out).toContain('You used all 3 tries');
    expect(out).toContain('Your best try was Try 2');
    expect(out).toContain('Try 2, best');
    expect(out).toContain('href="/read/questions"');
  });
});

describe('questions (BB-33)', () => {
  it('shows one question with its options and none of the story', () => {
    const out = render(<QuestionFlow question={fx.question} />);
    expect(out).toContain('In the story, what does the word patient mean?');
    expect(out).toContain('Question 3 of 5');
    expect(out).toContain('Answer from what you remember.');
    expect(out).toContain('Able to wait calmly');
    expect(out).toContain('Choose an answer to continue');
    expect(out).not.toContain(fx.reading.text);
    expect(out).not.toContain(fx.reading.title);
  });

  it('keeps the check button off until an option is picked', () => {
    const out = render(<QuestionFlow question={fx.question} />);
    expect(out).toMatch(/<button[^>]*disabled=""[^>]*>Check my answer/);
  });

  it('shows no option as right before the server has scored it', () => {
    const out = render(<QuestionFlow question={fx.question} />);
    expect(out).not.toContain('bb-option--correct');
    expect(out).not.toContain('bb-option--wrong');
  });

  it('shows the result with the right answer, skills and the level progress', () => {
    const out = render(<ResultScreen result={fx.result} />);
    expect(out).toContain('You answered 4 of 5');
    expect(out).toContain('Read to the end');
    expect(out).toContain('Words read right 94%');
    expect(out).toContain('Word meanings');
    expect(out).toContain('1/2');
    expect(out).toContain('This story passed.');
    expect(out).toContain('3 of 3 passed!');
    expect(out).toContain('You reached Level 25.');
    expect(out).toContain('href="/read/level-up"');
  });

  it('offers Learn when the story did not pass', () => {
    const out = render(
      <ResultScreen
        result={{
          ...fx.result,
          passed: false,
          levelChange: null,
          passedInRow: { passed: 0, needed: 3 },
          learn: { lessonId: 'word-meanings-1', skill: 'vocabulary' },
        }}
      />,
    );
    expect(out).toContain('This story did not pass.');
    expect(out).toContain('Practice word meanings in Learn.');
    expect(out).toContain('href="/learn/word-meanings-1"');
    expect(out).toContain('href="/read"');
  });

  it('shows no reading figures for a silent reading', () => {
    const out = render(
      <ResultScreen
        result={{ ...fx.result, silent: true, readToEnd: false, wordsRightPct: null }}
      />,
    );
    expect(out).toContain('Read silently');
    expect(out).not.toContain('Words read right');
  });

  it('shows level up with tries and the next change from the server', () => {
    const out = render(<LevelUpScreen view={fx.levelUp} />);
    expect(out).toContain('25');
    expect(out).toContain('You passed 3 stories in a row');
    expect(out).toContain('What is new at Level 25');
    expect(out).toContain('You still get 5 tries on each story');
    expect(out).toContain('At Level 31 you will get 4 tries on each story.');
    expect(out).toContain('about 30 to 60 words');
  });

  it('says when tries change at the new level', () => {
    const out = render(
      <LevelUpScreen view={{ ...fx.levelUp, triesBefore: 5, triesNow: 4, nextTries: null }} />,
    );
    expect(out).toContain('You now get 4 tries on each story');
  });
});

describe('placement (BB-51)', () => {
  it('G1 explains placement and offers start or later', () => {
    const out = render(<PlacementIntro step={{ step: 'intro', micApproved: true }} />);
    expect(out).toContain('Let us find your starting level');
    expect(out).toContain('Read a story out loud');
    expect(out).toContain('Do this later');
    expect(out).toContain('There are no hints in this test.');
    expect(out).not.toContain('read silently for now');
  });

  it('G1 says so when the parent has not approved the microphone', () => {
    const out = render(<PlacementIntro step={{ step: 'intro', micApproved: false }} />);
    expect(out).toContain('read silently for now');
  });

  it('G2 shows no scores between stories', () => {
    const out = render(<PlacementBetween step={{ step: 'between', storyNumber: 2 }} />);
    expect(out).toContain('Story 2');
    expect(out).toContain('Nice reading! One more story.');
    expect(out).toContain('We save your place.');
    expect(out).not.toMatch(/\d+%|\d+ of \d+/);
  });

  it('G3 shows the starting level, what we noticed and the help that is on', () => {
    const step = fx.placementResult;
    if (step.step !== 'result') throw new Error('fixture');
    const out = render(<PlacementResultScreen step={step} />);
    expect(out).toContain('34');
    expect(out).toContain('of 100');
    expect(out).toContain('This is a good place to start.');
    expect(out).toContain('You can take this test again after 30 days.');
    expect(out).toContain('Good at finding facts');
    expect(out).toContain('Practice: word meanings');
    expect(out).toContain('More help is turned on');
    expect(out).toContain('href="/account/help"');
  });

  it('G3 says the level is a first guess when no voice was heard, and hides help if off', () => {
    const step = fx.placementResult;
    if (step.step !== 'result') throw new Error('fixture');
    const out = render(
      <PlacementResultScreen
        step={{
          ...step,
          result: { ...step.result, flags: ['voice_missing'], recommendedHelp: 'standard' },
        }}
      />,
    );
    expect(out).toContain('first guess');
    expect(out).not.toContain('More help is turned on');
  });
});

describe('every screen has Filipino and simple wording', () => {
  it('renders each screen in Filipino without a missing message', () => {
    const nodes = [
      <HomeScreen key="h" home={fx.home} />,
      <ReadSession key="r" reading={fx.reading} />,
      <AnalysisScreen key="a" analysis={fx.analysis} />,
      <StoppedEarlyScreen key="s" analysis={fx.stoppedEarly} />,
      <TriesUsedScreen key="t" reading={fx.triesUsed} />,
      <QuestionFlow key="q" question={fx.question} />,
      <ResultScreen key="x" result={fx.result} />,
      <LevelUpScreen key="l" view={fx.levelUp} />,
      <PlacementIntro key="p1" step={{ step: 'intro', micApproved: false }} />,
      <PlacementBetween key="p2" step={{ step: 'between', storyNumber: 3 }} />,
    ];
    for (const node of nodes) {
      for (const wording of ['standard', 'simple'] as const) {
        const out = render(node, 'fil', wording);
        expect(out).not.toMatch(/student\.[a-zA-Z.]+/);
      }
    }
  });
});
