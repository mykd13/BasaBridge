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
  skip: {
    toContent: { standard: 'Skip to main content', simple: 'Skip to the page' },
  },
  nav: {
    main: { standard: 'Main', simple: 'Menu' },
    home: { standard: 'Home', lowLevel: true },
    learn: { standard: 'Learn', lowLevel: true },
    progress: { standard: 'My progress', simple: 'My steps', lowLevel: true },
    account: { standard: 'My account', simple: 'Me', lowLevel: true },
    signOut: { standard: 'Sign out', simple: 'Log out', lowLevel: true },
    parentAccount: { standard: 'Parent account' },
  },
  header: {
    newHere: { standard: 'New here? Create an account', simple: 'New? Make an account' },
    haveAccount: {
      standard: 'Already have an account? Sign in',
      simple: 'Have an account? Sign in',
    },
  },
  placeholder: {
    body: {
      standard: 'This screen is not built yet. It will show real activity when it is ready.',
      simple: 'This page is not ready yet.',
    },
    board: { standard: 'Design canvas {boards}' },
  },
  errors: {
    generic: {
      title: { standard: 'Something went wrong', simple: 'Oops. Something broke.' },
      body: {
        standard: 'We could not show this page. Please try again.',
        simple: 'We could not show this page. Try again.',
      },
    },
    notWired: {
      title: { standard: 'This part is not ready yet', simple: 'Not ready yet' },
      body: {
        standard: 'We are still building it. Please check back soon.',
        simple: 'We are still building it. Come back soon.',
      },
    },
    retry: { standard: 'Try again', lowLevel: true },
    notFound: {
      title: { standard: 'We could not find that page', simple: 'We cannot find that page' },
      body: {
        standard: 'The link may be old, or the page may have moved.',
        simple: 'The link may be old.',
      },
      action: { standard: 'Go to sign in' },
    },
  },
  browser: {
    unsupported: {
      title: { standard: 'This browser may not work well', simple: 'This browser may not work' },
      body: {
        standard:
          'Reading out loud needs a newer browser. You can still sign in. For the best result, use the latest Chrome, Edge, Samsung Internet or Firefox, or Safari 16.4 or newer.',
        simple: 'Use a newer browser to read out loud. You can still sign in.',
      },
    },
  },
  loading: {
    page: { standard: 'Loading', lowLevel: true },
  },
  idle: {
    title: { standard: 'Are you still there?', simple: 'Are you still there?' },
    body: {
      standard: 'You will be signed out soon to keep your account safe.',
      simple: 'We will log you out soon.',
    },
    stay: { standard: 'Stay signed in', simple: 'Stay logged in', lowLevel: true },
  },
  screens: {
    signIn: { standard: 'Sign in' },
    signUp: { standard: 'Create an account', simple: 'Make an account' },
    home: { standard: 'Student home and level', simple: 'Home and level' },
    read: { standard: 'Reading session', simple: 'Read aloud' },
    analysis: { standard: 'AI reading analysis', simple: 'How you read' },
    questions: { standard: 'Questions' },
    result: { standard: 'Result and level progress', simple: 'Your result' },
    levelUp: { standard: 'Level up' },
    progress: { standard: 'My progress', simple: 'My steps' },
    account: { standard: 'My account', simple: 'Me' },
    share: { standard: 'Share with a parent' },
    help: { standard: 'Reading help' },
    placement: { standard: 'Find my starting level', simple: 'Find my level' },
    placementNext: { standard: 'Between placement stories', simple: 'Next story' },
    placementResult: { standard: 'Your starting level', simple: 'Your level' },
    learn: { standard: 'Learn home', simple: 'Learn' },
    lesson: { standard: 'Lesson' },
    practice: { standard: 'Lesson practice', simple: 'Practice' },
    lessonDone: { standard: 'Lesson done', simple: 'All done' },
    words: { standard: 'Word practice: Say it', simple: 'Say the word' },
    parentLink: { standard: 'Link your child’s account', simple: 'Link your child' },
    parentProgress: { standard: 'Parent progress' },
    parentReadings: { standard: 'Readings and AI analysis' },
    parentLevels: { standard: 'Levels and tries' },
    parentDecisions: { standard: 'AI decisions' },
    parentPrivacy: { standard: 'Linked children and privacy' },
  },
  language: {
    label: { standard: 'Language', simple: 'Language' },
    en: { standard: 'English' },
    fil: { standard: 'Filipino' },
  },
} as const satisfies Catalog;
