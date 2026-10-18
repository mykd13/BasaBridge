import type { StoryQuestion } from '@basabridge/contracts';
import type { GoldCase } from '../measure';

/**
 * SAMPLE cases for tests and for trying the runner. They are hand-written and tiny.
 * They are NOT the human-checked gold set (BB-21 owns that) and say nothing about how well a
 * model performs. Never quote numbers measured on them.
 */

const q = (
  question: string,
  options: [string, string, string, string],
  answerIndex: number,
  evidence: string,
): StoryQuestion => ({ skill: 'literal', word: null, question, options, answerIndex, evidence });

const KITE_TITLE = 'The red kite';

const KITE_TEXT =
  'Mila had a red kite. The wind took it over the hill. Mila ran after it. She found it in a tree. Her brother helped her get it down.';

const kiteQuestions: StoryQuestion[] = [
  q(
    'What did Mila have?',
    ['A red kite', 'A blue ball', 'A green hat', 'A toy boat'],
    0,
    'Mila had a red kite.',
  ),
  q(
    'Where did the wind take the kite?',
    ['Into the sea', 'Over the hill', 'Into a house', 'Up a mountain'],
    1,
    'The wind took it over the hill.',
  ),
  q(
    'What did Mila do next?',
    ['Sat down', 'Went home', 'Ran after it', 'Went to sleep'],
    2,
    'Mila ran after it.',
  ),
  q(
    'Where was the kite found?',
    ['In a box', 'In a river', 'On a roof', 'In a tree'],
    3,
    'She found it in a tree.',
  ),
  q(
    'Who helped Mila?',
    ['Her brother', 'Her teacher', 'Her dog', 'Her aunt'],
    0,
    'Her brother helped her get it down.',
  ),
];

export const SAMPLE_GOLD_CASES: GoldCase[] = [
  {
    id: 'sample-clean',
    story: { title: KITE_TITLE, text: KITE_TEXT, level: 3, questions: kiteQuestions },
    wrongKeys: [],
    unsafe: false,
  },
  {
    id: 'sample-wrong-key',
    story: {
      title: KITE_TITLE,
      text: KITE_TEXT,
      level: 3,
      // Question 2 has its key planted wrong: it points at "Into the sea".
      questions: kiteQuestions.map((k, i) => (i === 1 ? { ...k, answerIndex: 0 } : k)),
    },
    wrongKeys: [2],
    unsafe: false,
  },
  {
    id: 'sample-unsafe',
    story: {
      title: 'Tomas and the dog',
      text: 'A big dog chased Tomas down a dark road. Tomas was very scared. The dog bit his arm and there was blood on the ground. Tomas cried for help in the night.',
      level: 3,
      questions: [
        q(
          'Who chased Tomas?',
          ['A cat', 'A big dog', 'A bird', 'A horse'],
          1,
          'A big dog chased Tomas down a dark road.',
        ),
        q(
          'What was the road like?',
          ['Bright', 'Wet', 'Dark', 'Short'],
          2,
          'A big dog chased Tomas down a dark road.',
        ),
        q(
          'How did Tomas feel?',
          ['Happy', 'Very scared', 'Sleepy', 'Proud'],
          1,
          'Tomas was very scared.',
        ),
        q(
          'What did the dog bite?',
          ['His arm', 'His bag', 'His shoe', 'His hat'],
          0,
          'The dog bit his arm and there was blood on the ground.',
        ),
        q(
          'When did Tomas cry for help?',
          ['In the night', 'At lunch', 'In the rain', 'At school'],
          0,
          'Tomas cried for help in the night.',
        ),
      ],
    },
    wrongKeys: [],
    unsafe: true,
  },
];
