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
      standard: 'Level {level} stories are {min} to {max} words.',
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
  account: {
    signIn: {
      title: { standard: 'Sign in' },
      heroTitle: {
        standard: 'Read out loud. Understand more.',
        simple: 'Read out loud. Learn more.',
      },
      heroBody: {
        standard:
          'Read a short story at your own level. Your AI teacher listens, helps with tricky words, then asks what you understood.',
        simple: 'Read a short story. Your AI teacher listens and helps.',
      },
      point1: {
        standard: 'Read aloud and get help right away',
        simple: 'Read aloud and get help',
      },
      point2: {
        standard: 'Stories that get harder as you improve',
        simple: 'Stories get harder as you grow',
      },
      point3: {
        standard: 'See your own progress, no one else needed',
        simple: 'See your own progress',
      },
      identifier: { standard: 'Username or email' },
      password: { standard: 'Password' },
      submit: { standard: 'Sign in' },
      forgot: { standard: 'Forgot your password?' },
      create: { standard: 'Create an account' },
      parentNote: {
        standard:
          'Parent or guardian? Sign in here with your own account to see a child’s progress.',
        simple: 'Parent? Sign in here with your own account.',
      },
    },
    signUp: {
      title: { standard: 'Create your account' },
      intro: {
        standard: 'Anyone can learn here. You do not need a parent or a school.',
        simple: 'Anyone can learn here.',
      },
      username: { standard: 'Username' },
      usernameHint: {
        standard: 'Not your full name. Letters and numbers only.',
        simple: 'Not your real name. Letters and numbers.',
      },
      password: { standard: 'Password' },
      passwordHint: { standard: 'At least {min} characters.' },
      email: { standard: 'Email (optional)' },
      emailHint: {
        standard: 'An email lets you reset your password. Without one, you cannot.',
        simple: 'An email lets you reset your password.',
      },
      submit: { standard: 'Create account' },
      parentTitle: { standard: 'Create a parent account' },
      parentIntro: {
        standard:
          'Your child has their own account. You make yours to see the progress they choose to share.',
        simple: 'Make your own account to see what your child shares.',
      },
      parentEmail: { standard: 'Your email' },
      parentSwitch: {
        standard: 'Parent or guardian? Create a parent account',
        simple: 'Parent? Make a parent account',
      },
      studentSwitch: {
        standard: 'Learner? Create a student account',
        simple: 'Student? Make a student account',
      },
    },
    reset: {
      title: { standard: 'Reset your password' },
      intro: {
        standard: 'Type the email on your account. We will send a link.',
        simple: 'Type your email. We will send a link.',
      },
      email: { standard: 'Email' },
      submit: { standard: 'Send link' },
      sent: {
        standard: 'If that email has an account, we sent a link. Check your inbox.',
        simple: 'If we know that email, we sent a link.',
      },
      noEmail: {
        standard:
          'No email on your account? We cannot reset it. Ask a parent or teacher to help you make a new account.',
        simple: 'No email on your account? We cannot reset it.',
      },
      back: { standard: 'Back to sign in' },
      newTitle: { standard: 'Choose a new password' },
      newPassword: { standard: 'New password' },
      newSubmit: { standard: 'Save password' },
      done: {
        standard: 'Your password is changed. Sign in with it.',
        simple: 'Password changed. Sign in with it.',
      },
      badLink: {
        standard: 'This link is not valid or has expired. Ask for a new one.',
        simple: 'This link does not work. Ask for a new one.',
      },
    },
    myAccount: {
      title: { standard: 'My account', simple: 'Me' },
      username: { standard: 'Username' },
      usernameFixed: { standard: 'Cannot be changed' },
      email: { standard: 'Email, for password reset', simple: 'Email, to reset password' },
      noEmail: {
        standard: 'No email. If you forget your password, we cannot reset it.',
        simple: 'No email. We cannot reset your password.',
      },
      passwordTitle: { standard: 'Change password' },
      currentPassword: { standard: 'Current password' },
      newPassword: { standard: 'New password' },
      passwordSubmit: { standard: 'Change password' },
      passwordChanged: { standard: 'Your password is changed.' },
      voiceTitle: { standard: 'My voice' },
      voiceBody: {
        standard:
          'When you read aloud, your voice is turned into text to follow along. The audio is then thrown away.',
        simple: 'Your voice becomes text. The audio is thrown away.',
      },
      notReady: {
        standard: 'Recording, download and delete settings are not ready yet.',
        simple: 'These settings are not ready yet.',
      },
      shareTitle: { standard: 'Parent or guardian', simple: 'Parent' },
      shareBody: {
        standard: 'Optional. You choose whether anyone else sees your progress.',
        simple: 'You choose who sees your progress.',
      },
      shareLink: { standard: 'Share my progress' },
      helpLink: { standard: 'Reading help' },
    },
    share: {
      title: { standard: 'Share your progress with a parent', simple: 'Share with a parent' },
      intro: {
        standard:
          'This is your choice. You can use BasaBridge without anyone else. If you want a parent or guardian to cheer you on, give them a code.',
        simple: 'This is your choice. You can learn without sharing.',
      },
      codeTitle: { standard: 'Your link code' },
      codeEmpty: { standard: 'You have no code yet.' },
      codeHelp: {
        standard:
          'Your parent signs in with their own account and types this code. It works once and stops working after 24 hours.',
        simple: 'Your parent types this code. It works once.',
      },
      makeCode: { standard: 'Make a code' },
      seeTitle: { standard: 'What a parent can see' },
      seeProgress: { standard: 'My level and skills' },
      seeProgressBody: { standard: 'Level, tries used, comprehension and reading scores.' },
      seeAnalysis: { standard: 'Reading analysis' },
      seeAnalysisBody: { standard: 'Words I find tricky and the AI teacher’s notes.' },
      voiceNever: { standard: 'My voice recordings' },
      voiceNeverBody: { standard: 'Parents never see or hear these.' },
      linkedTitle: { standard: 'Linked parents' },
      linkedEmpty: {
        standard: 'No parent is linked yet. The switches appear here after a parent links.',
        simple: 'No parent is linked yet.',
      },
      linkedOn: { standard: 'Linked' },
      stop: { standard: 'Stop sharing' },
      save: { standard: 'Save choices', simple: 'Save' },
    },
    parentLink: {
      title: { standard: 'Link your child’s account', simple: 'Link your child' },
      intro: {
        standard:
          'Your child has their own BasaBridge account and chooses to share their progress with you. Ask them for the link code from My account, then type it here.',
        simple: 'Ask your child for their link code. Type it here.',
      },
      code: { standard: 'Link code' },
      codeHint: { standard: 'It looks like BB-4F7K-92.' },
      confirm: { standard: 'I am this child’s parent or legal guardian.' },
      submit: { standard: 'Link child' },
      seeTitle: { standard: 'What you will see' },
      see1: { standard: 'Level, tries and skill scores' },
      see2: { standard: 'Words your child finds tricky' },
      see3: { standard: 'The AI teacher’s notes and decisions' },
      noVoice: {
        standard:
          'You never see or hear your child’s voice recordings. Your child can stop sharing at any time.',
      },
    },
    state: {
      pending: { standard: 'Please wait' },
      notWired: {
        standard: 'This part is not ready yet. We are still building it.',
        simple: 'Not ready yet. Come back soon.',
      },
    },
    errors: {
      required: { standard: 'Please fill this in.' },
      usernameLength: { standard: 'Use {min} to {max} characters.' },
      usernameChars: { standard: 'Use letters and numbers only.' },
      usernameNotAllowed: {
        standard: 'Pick a different username. Do not use your name, school or phone number.',
        simple: 'Pick a different username.',
      },
      usernameTaken: { standard: 'That username is taken. Try another.' },
      passwordShort: { standard: 'Use at least {min} characters.' },
      passwordLong: { standard: 'That password is too long.' },
      passwordWrong: { standard: 'That is not your current password.' },
      emailInvalid: { standard: 'That does not look like an email.' },
      invalidLogin: {
        standard: 'The username, email or password is not right. Try again.',
        simple: 'Not right. Try again.',
      },
      locked: {
        standard: 'Too many tries. Wait {minutes} minutes, then try again.',
        simple: 'Too many tries. Wait {minutes} minutes.',
      },
      signUpFailed: {
        standard:
          'We could not make that account. Check your details, or sign in if you already have one.',
        simple: 'We could not make that account. Try again.',
      },
      notWired: {
        standard: 'This part is not ready yet. We are still building it.',
        simple: 'Not ready yet. Come back soon.',
      },
      generic: { standard: 'Something went wrong. Please try again.', simple: 'Oops. Try again.' },
    },
  },
  language: {
    label: { standard: 'Language', simple: 'Language' },
    en: { standard: 'English' },
    fil: { standard: 'Filipino' },
  },
} as const satisfies Catalog;
