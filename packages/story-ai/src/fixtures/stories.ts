/**
 * Fixtures for the deterministic checks (BB-16): one good story for each tier and one bad
 * version for each failure code. They are test data written by hand for the checks. They are not
 * learner data and not seed data for the app.
 */
import { countWords, type CheckFailureCode, type RawQuestion } from '../checks';

export interface StoryFixture {
  name: string;
  /** A level inside the tier the story is written for. */
  level: number;
  text: string;
  questions: RawQuestion[];
}

const q = (
  skill: 'literal' | 'inferential' | 'vocabulary',
  question: string,
  options: [string, string, string, string],
  answerIndex: number,
  evidence: string,
  word: string | null = null,
): RawQuestion => ({ skill, word, question, options, answerIndex, evidence });

/** Tier 1, levels 1 to 10: 5 to 15 words. */
const TIER_1: StoryFixture = {
  name: 'tier 1 (kite)',
  level: 5,
  text: 'Sam has a red kite. The kite is up high. Sam runs fast.',
  questions: [
    q(
      'literal',
      'What does Sam have?',
      ['A red kite', 'A red hat', 'A blue ball', 'A big dog'],
      0,
      'Sam has a red kite.',
    ),
    q(
      'literal',
      'Where is the kite?',
      ['In a box', 'Up high', 'In the mud', 'On a bed'],
      1,
      'The kite is up high.',
    ),
    q(
      'inferential',
      'What is Sam doing with the kite?',
      ['Selling it', 'Hiding it', 'Flying it', 'Fixing it'],
      2,
      'The kite is up high.',
    ),
    q(
      'inferential',
      'Why does Sam run fast?',
      ['To win a race', 'To keep the kite up', 'To get home', 'To find a dog'],
      1,
      'Sam runs fast.',
    ),
    q(
      'vocabulary',
      'What does "high" mean?',
      ['Far from the ground', 'Very small', 'Very loud', 'Made of wood'],
      0,
      'The kite is up high.',
      'high',
    ),
  ],
};

/** Tier 2, levels 11 to 30: 25 to 50 words. */
const TIER_2: StoryFixture = {
  name: 'tier 2 (mango tree)',
  level: 20,
  text: 'Lia and her grandfather have a mango tree. Every morning, Lia checks the tree. The mangoes are still green. One day, the wind blows hard. Three mangoes fall. Lia picks them up, but they are too sour. Grandfather smiles. "We must be patient," he says.',
  questions: [
    q(
      'literal',
      'Where does Lia check every morning?',
      ['The tree', 'The river', 'The school', 'The market'],
      0,
      'Every morning, Lia checks the tree.',
    ),
    q(
      'literal',
      'What falls when the wind blows hard?',
      ['Two coconuts', 'Three mangoes', 'Four leaves', 'Five stones'],
      1,
      'Three mangoes fall.',
    ),
    q(
      'inferential',
      'Why are the fallen mangoes sour?',
      ['They are not ripe yet', 'They were cooked', 'They are old', 'They are wet'],
      0,
      'The mangoes are still green.',
    ),
    q(
      'inferential',
      'What does Grandfather want Lia to learn?',
      ['To climb trees', 'To be patient', 'To run fast', 'To cook'],
      1,
      '"We must be patient," he says.',
    ),
    q(
      'vocabulary',
      'What does "patient" mean?',
      ['Able to wait calmly', 'Very hungry', 'Always angry', 'Quick to leave'],
      0,
      '"We must be patient," he says.',
      'patient',
    ),
  ],
};

/** Tier 3, levels 31 to 55: 50 to 90 words. Has dialogue. */
const TIER_3: StoryFixture = {
  name: 'tier 3 (crab)',
  level: 40,
  text: 'On Saturday, Ben and his sister Ana went to the beach. The tide was low, so they could walk far along the sand. Ana found a small crab hiding under a rock. "Look at its tiny claws!" she said. Ben wanted to take the crab home. Ana shook her head. "It lives here," she explained. Ben gently put the rock back, and they watched the crab scurry away.',
  questions: [
    q(
      'literal',
      'When did Ben and Ana go to the beach?',
      ['On Saturday', 'On Monday', 'On Friday', 'On Sunday'],
      0,
      'On Saturday, Ben and his sister Ana went to the beach.',
    ),
    q(
      'literal',
      'Where was the small crab hiding?',
      ['In the water', 'Under a rock', 'In a shell', 'In the sand'],
      1,
      'Ana found a small crab hiding under a rock.',
    ),
    q(
      'inferential',
      'Why did Ana shake her head?',
      [
        'She did not want the crab taken home',
        'She was cold',
        'She did not see the crab',
        'She was tired',
      ],
      0,
      'Ben wanted to take the crab home.',
    ),
    q(
      'inferential',
      'What does "It lives here" tell us about Ana?',
      [
        "She thinks the beach is the crab's home",
        'She dislikes crabs',
        'She lives at the beach',
        'She is afraid',
      ],
      0,
      '"It lives here," she explained.',
    ),
    q(
      'vocabulary',
      'What does "scurry" mean?',
      ['Move quickly with small steps', 'Sleep', 'Swim slowly', 'Dig deep'],
      0,
      'Ben gently put the rock back, and they watched the crab scurry away.',
      'scurry',
    ),
  ],
};

/** Tier 4, levels 56 to 75: 90 to 140 words. */
const TIER_4: StoryFixture = {
  name: 'tier 4 (garden)',
  level: 60,
  text: 'Every Friday, the students at Rizal Elementary work in the school garden. This term, Grade 4 is growing tomatoes, and the plants are finally tall enough to need support. Mr. Cruz shows the class how to tie each stem to a bamboo stick with soft string. Mia ties hers too tightly, and the stem bends. She unties it and tries again, leaving a little room for the plant to grow. By the end of the afternoon, every plant stands straight. Mr. Cruz smiles and says that careful work now means more tomatoes later. The students cannot wait to see the first red fruit.',
  questions: [
    q(
      'literal',
      'On which day do the students work in the garden?',
      ['Monday', 'Wednesday', 'Friday', 'Sunday'],
      2,
      'Every Friday, the students at Rizal Elementary work in the school garden.',
    ),
    q(
      'literal',
      'What does Mr. Cruz use to tie each stem?',
      ['Soft string and a bamboo stick', 'Wire and a nail', 'Tape and a spoon', 'Rope and a pole'],
      0,
      'Mr. Cruz shows the class how to tie each stem to a bamboo stick with soft string.',
    ),
    q(
      'inferential',
      'Why does Mia untie the string?',
      [
        'It was too tight for the stem',
        'It was the wrong colour',
        'It was too long',
        'It was dirty',
      ],
      0,
      'Mia ties hers too tightly, and the stem bends.',
    ),
    q(
      'inferential',
      'What does Mr. Cruz believe about careful work?',
      ['It leads to a better harvest', 'It is boring', 'It is not needed', 'It takes too long'],
      0,
      'Mr. Cruz smiles and says that careful work now means more tomatoes later.',
    ),
    q(
      'vocabulary',
      'What does "support" mean here?',
      [
        'Something that holds a plant up',
        'A kind of fruit',
        'A garden tool for digging',
        'A type of soil',
      ],
      0,
      'This term, Grade 4 is growing tomatoes, and the plants are finally tall enough to need support.',
      'support',
    ),
  ],
};

/** Tier 5, levels 76 to 90: 140 to 200 words. */
const TIER_5: StoryFixture = {
  name: 'tier 5 (well)',
  level: 80,
  text: 'The village of San Roque sits at the bottom of a hill, and for many years its people carried water from a stream far away. Every morning before school, the children walked two kilometres with heavy buckets. When the dry season came, the stream shrank to a thin trickle, and some days it vanished altogether. Tired of the long walks, the villagers held a meeting and decided to dig a well near the chapel. Everyone helped. The men dug, the women carried away the soil, and the children passed along tools and cups of water. After three weeks, the diggers struck damp earth, and soon clear water bubbled up from below. That evening, the whole village gathered around the well to celebrate. Old Mang Tonyo, who had carried water for sixty years, was the first to drink. He closed his eyes, smiled, and said it was the sweetest water he had ever tasted.',
  questions: [
    q(
      'literal',
      'How far did the children walk each morning?',
      ['Two kilometres', 'Ten kilometres', 'Half a kilometre', 'Five kilometres'],
      0,
      'Every morning before school, the children walked two kilometres with heavy buckets.',
    ),
    q(
      'literal',
      'Where did the villagers decide to dig the well?',
      ['Near the chapel', 'Near the school', 'On the hill', 'By the stream'],
      0,
      'Tired of the long walks, the villagers held a meeting and decided to dig a well near the chapel.',
    ),
    q(
      'inferential',
      'Why was the walk harder in the dry season?',
      [
        'The stream nearly dried up',
        'The buckets got heavier',
        'School started earlier',
        'The hill grew steeper',
      ],
      0,
      'When the dry season came, the stream shrank to a thin trickle, and some days it vanished altogether.',
    ),
    q(
      'inferential',
      'Why was Mang Tonyo the first to drink?',
      [
        'He had carried water the longest',
        'He dug the deepest',
        'He owned the land',
        'He was the youngest',
      ],
      0,
      'Old Mang Tonyo, who had carried water for sixty years, was the first to drink.',
    ),
    q(
      'vocabulary',
      'What does "trickle" mean?',
      ['A very small flow', 'A loud splash', 'A frozen lake', 'A strong wave'],
      0,
      'When the dry season came, the stream shrank to a thin trickle, and some days it vanished altogether.',
      'trickle',
    ),
  ],
};

/** Tier 6, levels 91 to 100: 200 to 260 words. */
const TIER_6: StoryFixture = {
  name: 'tier 6 (lighthouse)',
  level: 95,
  text: 'For thirty years, Mateo kept the lighthouse on the rocky northern point of the island. Each evening he climbed the one hundred and twelve steps to the lamp room, polished the great lens, and waited for the sun to sink into the sea. Ships passing in the dark depended on his light, though most of their sailors never learned his name. When the new electric beacon was installed, officials told him that the old lamp would no longer be needed. Mateo was quiet for a long while. He had never thought of the work as important; it was simply what he did. But that night, a fishing boat lost in thick fog drifted toward the rocks, and the electric beacon failed in the damp air. The sailors saw only darkness until a faint yellow glow appeared above the cliff. Mateo had lit the old lamp out of habit. Guided by that small flame, the boat turned away from the rocks and slipped safely into the harbour. In the morning, the harbour master visited the lighthouse and asked Mateo to keep the old lamp burning beside the new one. "Machines are useful," he admitted, "but they cannot replace someone who is paying attention."',
  questions: [
    q(
      'literal',
      'How many steps did Mateo climb each evening?',
      ['Twelve', 'One hundred and twelve', 'Two hundred', 'Thirty'],
      1,
      'Each evening he climbed the one hundred and twelve steps to the lamp room, polished the great lens, and waited for the sun to sink into the sea.',
    ),
    q(
      'literal',
      'What happened to the electric beacon in the fog?',
      ['It failed', 'It grew brighter', 'It was stolen', 'It was turned off by Mateo'],
      0,
      'But that night, a fishing boat lost in thick fog drifted toward the rocks, and the electric beacon failed in the damp air.',
    ),
    q(
      'inferential',
      'Why did Mateo light the old lamp?',
      ['Out of habit', 'To test it', 'Because officials asked', 'To clean it'],
      0,
      'Mateo had lit the old lamp out of habit.',
    ),
    q(
      'inferential',
      'What does the harbour master mean by his last words?',
      [
        'People who pay attention matter more than machines alone',
        'Machines are dangerous',
        'Lamps are better than beacons',
        'Fog is harmless',
      ],
      0,
      '"Machines are useful," he admitted, "but they cannot replace someone who is paying attention."',
    ),
    q(
      'vocabulary',
      'What does "beacon" mean?',
      ['A light that guides ships', 'A kind of boat', 'A rocky cliff', 'A harbour worker'],
      0,
      'When the new electric beacon was installed, officials told him that the old lamp would no longer be needed.',
      'beacon',
    ),
  ],
};

/** One good story for each of the six tiers, in tier order. */
export const GOOD_STORIES: StoryFixture[] = [TIER_1, TIER_2, TIER_3, TIER_4, TIER_5, TIER_6];

export interface BadVersion {
  code: CheckFailureCode;
  name: string;
  /** Story-level codes fail the story. Question-level codes drop the one question. */
  story: StoryFixture;
}

/** Copies the tier 2 story with one question changed. */
const withQuestion = (
  index: number,
  change: (question: RawQuestion) => RawQuestion,
): StoryFixture => ({
  ...TIER_2,
  questions: TIER_2.questions.map((question, i) => (i === index ? change(question) : question)),
});

/** Common words, so only the reading grade fails: long words in one long sentence. */
const HARD_SENTENCE =
  'Actually, the government already understood the important information about every different company.';

/** Short words, so only the vocabulary fails: three words a tier 1 learner does not know. */
const RARE_SENTENCE = 'Sam saw a puce kite soar aloft.';

/** Each bad version breaks exactly one thing in a good story. */
export const BAD_VERSIONS: BadVersion[] = [
  {
    code: 'too_short',
    name: 'tier 2 story checked at a level that needs more words',
    story: { ...TIER_2, name: 'too short', level: TIER_3.level },
  },
  {
    code: 'too_long',
    name: 'tier 2 story with extra short sentences added at the end',
    story: {
      ...TIER_2,
      name: 'too long',
      text: `${TIER_2.text}${' Go on.'.repeat(Math.ceil((60 - countWords(TIER_2.text)) / 2))}`,
    },
  },
  {
    code: 'too_hard',
    name: 'one very long-worded sentence in a tier 1 story',
    story: {
      name: 'too hard',
      level: TIER_1.level,
      text: HARD_SENTENCE,
      questions: TIER_1.questions.map((question) => ({
        ...question,
        word: question.word ? 'company' : null,
        evidence: HARD_SENTENCE,
      })),
    },
  },
  {
    code: 'too_many_new_words',
    name: 'rare words in a tier 1 story',
    story: {
      name: 'too many new words',
      level: TIER_1.level,
      text: RARE_SENTENCE,
      questions: TIER_1.questions.map((question) => ({
        ...question,
        word: question.word ? 'kite' : null,
        evidence: RARE_SENTENCE,
      })),
    },
  },
  {
    code: 'too_few_questions',
    name: 'only three questions',
    story: { ...TIER_2, name: 'too few questions', questions: TIER_2.questions.slice(0, 3) },
  },
  {
    code: 'bad_shape',
    name: 'a question with three options',
    story: withQuestion(4, (question) => ({ ...question, options: ['a', 'b', 'c'] })),
  },
  {
    code: 'options_not_distinct',
    name: 'two options say the same thing',
    story: withQuestion(4, (question) => ({
      ...question,
      options: ['Able to wait calmly', 'Very hungry', 'Always angry', ' ABLE to wait  calmly'],
    })),
  },
  {
    code: 'answer_out_of_range',
    name: 'the answer index is 4',
    story: withQuestion(4, (question) => ({ ...question, answerIndex: 4 })),
  },
  {
    code: 'evidence_missing',
    name: 'evidence that is not in the passage',
    story: withQuestion(4, (question) => ({
      ...question,
      evidence: 'Lia sells the mangoes at the market.',
    })),
  },
  {
    code: 'evidence_not_sentence',
    name: 'evidence that stops before the end of the sentence',
    story: withQuestion(4, (question) => ({ ...question, evidence: '"We must be patient,"' })),
  },
  {
    code: 'vocab_word_missing',
    name: 'a vocabulary word that is not in the passage',
    story: withQuestion(4, (question) => ({ ...question, word: 'spaceship' })),
  },
  {
    code: 'duplicate_question',
    name: 'the last question repeats the first',
    story: withQuestion(4, (question) => ({
      ...question,
      question: String(TIER_2.questions[0]?.question),
    })),
  },
];
