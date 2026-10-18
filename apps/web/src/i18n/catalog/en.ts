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
  legal: {
    links: {
      privacy: { standard: 'Privacy notice', simple: 'Privacy' },
      terms: { standard: 'Terms of use', simple: 'Rules' },
      kids: { standard: 'Privacy for kids', simple: 'Privacy for kids' },
    },
    nav: { standard: 'Legal', simple: 'Privacy and rules' },
    version: { standard: 'Version {version}' },
    contact: { standard: 'Questions about privacy? Write to <mail>{email}</mail>.' },
    contactMissing: { standard: 'The privacy contact address is not set yet.' },
    providers: {
      name: { standard: 'Service' },
      purpose: { standard: 'What it does' },
      sees: { standard: 'What it sees' },
      neverSees: { standard: 'What it never sees' },
      undecided: { standard: 'Not chosen yet' },
      caption: { standard: 'Services that handle data for BasaBridge' },
    },
    speak: {
      listen: { standard: 'Listen to this paragraph', simple: 'Listen' },
      stop: { standard: 'Stop listening', simple: 'Stop' },
    },
    update: {
      title: { standard: 'We updated our privacy notice or terms' },
      body: {
        standard: 'Please read what changed. You can use BasaBridge again after you agree.',
      },
      later: {
        standard:
          'Agreeing to the new version is not ready yet. It arrives with the consent records.',
      },
    },
    kids: {
      draft: {
        standard:
          'Draft. Awaiting qualified review. A grown-up who knows the law will check this page.',
        spoken: true,
      },
      what1: { standard: 'BasaBridge helps you read stories.', spoken: true },
      what2: { standard: 'You read out loud, and a computer checks the words.', spoken: true },
      keep1: { standard: 'We keep your username.', spoken: true },
      keep2: { standard: 'We keep how you read and how you answered.', spoken: true },
      voice1: { standard: 'We use your voice to check your reading.', spoken: true },
      voice2: { standard: 'Then we throw it away, unless you choose to keep it.', spoken: true },
      voice3: {
        standard: 'If you keep it, we delete it after 30 days. Parents never hear it.',
        spoken: true,
      },
      helpers1: { standard: 'Some computer helpers work with BasaBridge.', spoken: true },
      helpers2: { standard: 'We never send your name or username to a helper.', spoken: true },
      helpers3: {
        standard: 'Your voice goes only to the helper that listens to your reading.',
        spoken: true,
      },
      grownup1: {
        standard: 'If you are under 13, a grown-up must say yes before you use the microphone.',
        spoken: true,
      },
      grownup2: { standard: 'You can still read quietly and answer questions.', spoken: true },
      share1: { standard: 'You choose what a parent can see.', spoken: true },
      share2: { standard: 'You can stop sharing at any time.', spoken: true },
      ask1: {
        standard: 'Have a question? Ask a grown-up to write to the address on this page.',
        spoken: true,
      },
    },
  },
  language: {
    label: { standard: 'Language', simple: 'Language' },
    en: { standard: 'English' },
    fil: { standard: 'Filipino' },
  },
} as const satisfies Catalog;
