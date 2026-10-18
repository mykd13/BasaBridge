import type {
  Analysis,
  AnswerFeedback,
  LevelUpView,
  PlacementStep,
  QuestionView,
  Reading,
  ResultView,
  StudentHome,
} from './schemas';
import type { StudentData } from './data';

/**
 * Values for tests only. They stand in for what the engine would return. App code never
 * imports this file, so no screen ever shows these (AGENTS.md rule 8).
 */

export const SESSION_ID = '11111111-1111-4111-8111-111111111111';
export const QUESTION_ID = '22222222-2222-4222-8222-222222222222';
export const TRY_ID = 'a'.repeat(32);

export const home: StudentHome = {
  displayName: 'Test learner',
  level: 24,
  maxLevel: 100,
  progress: { passed: 2, needed: 3, nextLevel: 25 },
  triesPerStory: 5,
  words: { min: 25, max: 50 },
  note: { text: 'You read the whole story smoothly last time.', source: 'standard' },
};

export const reading: Extract<Reading, { status: 'ready' }> = {
  status: 'ready',
  sessionId: SESSION_ID,
  level: 24,
  title: 'The Test Tree',
  text: 'A tree stands by a road. It is very old.',
  tryNumber: 2,
  triesAllowed: 5,
  micAllowed: true,
};

export const triesUsed: Extract<Reading, { status: 'tries_used' }> = {
  status: 'tries_used',
  level: 24,
  triesAllowed: 3,
  bestTry: 2,
  tries: [
    { n: 1, pct: 78, best: false },
    { n: 2, pct: 94, best: true },
    { n: 3, pct: 91, best: false },
  ],
  note: { text: 'You got better at the hard words.', source: 'ai' },
};

export const analysis: Analysis = {
  sessionId: SESSION_ID,
  completed: true,
  tryNumber: 2,
  triesAllowed: 5,
  triesLeft: 3,
  wordsRight: 52,
  wordsTotal: 55,
  wordsPerMinute: 62,
  tries: [
    { n: 1, pct: 87, best: false },
    { n: 2, pct: 94, best: true },
  ],
  notes: [{ text: 'Take a small breath at each full stop.', source: 'standard' }],
  practiceWords: ['patient'],
  unclearWords: [{ index: 4, word: 'tree' }],
  review: 'none',
  conditions: [],
  stoppedAt: null,
};

export const stoppedEarly: Analysis = {
  ...analysis,
  completed: false,
  wordsRight: 30,
  stoppedAt: { word: 'sour', excerpt: 'but they are too sour. Grandfather smiles.' },
};

export const question: Extract<QuestionView, { status: 'question' }> = {
  status: 'question',
  sessionId: SESSION_ID,
  questionId: QUESTION_ID,
  index: 3,
  total: 5,
  text: 'In the story, what does the word patient mean?',
  options: ['Able to wait calmly', 'Very hungry', 'Full of energy', 'Afraid of the wind'],
  readAloud: true,
};

export const feedbackWrong: AnswerFeedback = {
  correct: false,
  chosenIndex: 1,
  correctIndex: 0,
  last: false,
  learnLessonId: 'word-meanings-1',
};

export const result: ResultView = {
  level: 24,
  answered: { right: 4, total: 5 },
  readToEnd: true,
  silent: false,
  wordsRightPct: 94,
  skills: [
    { skill: 'vocabulary', right: 1, total: 2 },
    { skill: 'literal', right: 2, total: 2 },
    { skill: 'inferential', right: 1, total: 1 },
  ],
  note: { text: 'You found the facts.', source: 'standard' },
  passed: true,
  passedInRow: { passed: 3, needed: 3 },
  levelChange: { from: 24, to: 25 },
  learn: null,
};

export const levelUp: LevelUpView = {
  level: 25,
  passedInRow: 3,
  words: { min: 30, max: 60 },
  triesBefore: 5,
  triesNow: 5,
  nextTries: { level: 31, tries: 4 },
};

export const placementIntro: PlacementStep = { step: 'intro', micApproved: true };
export const placementBetween: PlacementStep = { step: 'between', storyNumber: 2 };
export const placementResult: PlacementStep = {
  step: 'result',
  maxLevel: 100,
  strongSkill: 'literal',
  practiceSkill: 'vocabulary',
  retakeDays: 30,
  result: {
    level: 34,
    theta: 0.4,
    sd: 0.5,
    confidence: 'building',
    storiesRead: 3,
    flags: [],
    recommendedHelp: 'more',
  },
};

/** A StudentData that answers every call from the values above. Spread it to change one call. */
export function fakeStudentData(overrides: Partial<StudentData> = {}): StudentData {
  const ok =
    <T>(data: T) =>
    async () => ({ ok: true as const, data });
  return {
    getStudentHome: ok(home),
    getReading: ok(reading),
    finishTry: ok({ next: 'analysis' as const }),
    getAnalysis: ok(analysis),
    recordWordTap: ok(null),
    markMisheard: ok(null),
    getQuestion: ok(question),
    submitAnswer: ok(feedbackWrong),
    getResult: ok(result),
    getLevelUp: ok(levelUp),
    getPlacementStep: ok(placementIntro),
    startPlacementStory: ok(null),
    deferPlacement: ok(null),
    ...overrides,
  };
}
