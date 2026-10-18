import type { Catalog } from '../types.ts';

export const en = {
  app: {
    name: { standard: 'BasaBridge' },
    tagline: {
      standard: 'Read out loud. Understand more.',
      simple: 'Read out loud.',
      spoken: true,
      lowLevel: true,
    },
  },
  home: {
    levelOne: {
      standard: 'Level {level} stories are {min} to {max} words with {tries}.',
    },
    tries: { standard: '{count, plural, one {# try} other {# tries}}' },
    triesUnlimited: {
      standard: 'unlimited tries',
    },
  },
  learn: {
    title: { standard: 'Learn' },
    listenPage: { standard: 'Listen to this page' },
    empty: {
      standard:
        'No lessons yet. After you read a story and miss some questions, lessons that can help show up here.',
      simple: 'Lessons show up after a story.',
    },
    leave: { standard: 'Go back' },
    emptyAction: { standard: 'Read a story' },
    recommended: { standard: 'Recommended for you' },
    notFound: { standard: 'We could not find that lesson.' },
    backToLearn: { standard: 'Back to Learn' },
    status: {
      new: { standard: 'New' },
      waitingForStory: { standard: 'Waiting for your next story' },
      learned: { standard: 'Learned' },
    },
    card: {
      waiting: {
        standard:
          'Finished. {count, plural, one {# check question} other {# check questions}} will come in your next story.',
      },
      learned: { standard: 'You got the check questions right in your last story.' },
      open: { standard: 'Open lesson: {title}' },
    },
    group: {
      vocabulary: { standard: 'Word meanings' },
      literal: { standard: 'Facts and order' },
      inferential: { standard: 'Thinking about the story' },
      decoding: { standard: 'Reading smoothly' },
      wordPractice: { standard: 'Tricky words' },
    },
    subject: {
      word_in_context: { standard: 'word meanings' },
      word_parts: { standard: 'parts of words' },
      key_detail: { standard: 'key details' },
      sequence: { standard: 'what happens first, next and last' },
      main_idea: { standard: 'the main idea' },
      cause_effect: { standard: 'why things happen' },
      feelings: { standard: 'how a character feels' },
      prediction: { standard: 'what will happen next' },
      conclusion: { standard: 'what clues tell us' },
      decoding: { standard: 'reading words smoothly' },
      word_practice: { standard: 'tricky words' },
    },
    result: {
      learnButton: { standard: 'Learn' },
      readNew: { standard: 'Read a new story' },
      teachTitle: { standard: 'What Learn will teach' },
      reason: {
        standard: 'You missed {count, plural, one {# question} other {# questions}} about {skill}.',
      },
      reasonNoCount: { standard: 'This lesson helps with {skill}.' },
      note: {
        standard: 'Learning here does not change your level. Your next story checks what stuck.',
        simple: 'Learn does not change your level.',
      },
    },
    link: { aboutThis: { standard: 'Learn about this' } },
    lesson: {
      kicker: { standard: 'Lesson · {group}' },
      goal: { standard: 'Goal: {goal}' },
      trick: { standard: 'The trick' },
      example: { standard: 'Example' },
      listen: { standard: 'Listen to this step' },
      next: { standard: 'Next' },
      back: { standard: 'Back' },
      tryIt: { standard: 'Next: try it' },
      finish: { standard: 'Finish' },
      step: { standard: 'Step {current} of {total}' },
    },
    practice: {
      readThis: { standard: 'Read this' },
      listenQuestion: { standard: 'Listen to the question' },
      tapWord: { standard: 'Tap a word to hear it.' },
      item: { standard: 'Question {current} of {total}' },
      hint: { standard: 'Hint' },
      yes: { standard: 'Yes!' },
      notQuite: { standard: 'Not quite. Try another answer.' },
      answerIs: { standard: 'The answer is: {answer}' },
      next: { standard: 'Next' },
      finish: { standard: 'Finish practice' },
      notReady: {
        title: { standard: 'Practice is not ready yet' },
        body: { standard: 'We are still getting practice questions for this lesson.' },
      },
      none: { standard: 'This lesson has no practice questions.' },
    },
    done: {
      title: { standard: 'You finished: {title}' },
      listen: { standard: 'Listen to this page' },
      icon: { standard: 'Done' },
      next: {
        standard:
          'Next, read a new story. It will have {count, plural, one {# question} other {# questions}} about this trick to see if it stuck.',
      },
      badge: {
        standard:
          'The "Learned" badge arrives after you answer those {count, plural, one {# question} other {# questions}} well in a real story. Practice here does not change your level.',
      },
    },
  },
  language: {
    label: { standard: 'Language', simple: 'Language' },
    en: { standard: 'English' },
    fil: { standard: 'Filipino' },
  },
} as const satisfies Catalog;
