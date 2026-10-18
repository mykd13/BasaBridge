import type { Catalog } from '../types.ts';

/**
 * Student screens: home, reading session, questions, result, level up and placement.
 * Wording follows design canvas S2 to S13 and G1 to G3. Numbers (levels, tries, counts) are
 * placeholders filled from the server, never written into the wording (golden rule 6).
 */
export const studentEn = {
  common: {
    level: { standard: 'Level {level}', lowLevel: true },
    levelOf: { standard: '{level} of {max}' },
    homeLink: { standard: 'Back to home', simple: 'Go home', lowLevel: true },
    notReadyTitle: { standard: 'This part is not ready yet', simple: 'Not ready yet' },
    notReadyBody: {
      standard: 'We are still building it. Please check back soon.',
      simple: 'We are still building it. Come back soon.',
    },
    nothingTitle: { standard: 'Nothing to show yet', simple: 'Nothing here yet' },
    skillVocabulary: { standard: 'Word meanings' },
    skillLiteral: { standard: 'Finding facts' },
    skillInferential: { standard: 'Reading between the lines' },
    skillVocabularyLower: { standard: 'word meanings' },
    skillLiteralLower: { standard: 'finding facts' },
    skillInferentialLower: { standard: 'reading between the lines' },
    skillDecodingLower: { standard: 'sounding out words' },
    skillFluencyLower: { standard: 'reading smoothly' },
    triesCount: {
      standard: '{count, plural, one {# try} other {# tries}} on each story',
      simple: '{count, plural, one {# try} other {# tries}} each story',
    },
    triesUnlimited: { standard: 'As many tries as you need on each story' },
    teacherSays: { standard: 'Your teacher says' },
    teacherSaysNoNote: {
      standard: 'Read a story and your teacher will leave you a note here.',
      simple: 'Read a story. Your teacher will write here.',
    },
    micOff: { standard: 'Microphone off' },
  },

  home: {
    greetingNamed: { standard: 'Hi, {name}!' },
    greeting: { standard: 'Hi!' },
    readNew: { standard: 'Read a new story', simple: 'Read a story', lowLevel: true },
    seeProgress: { standard: 'See my progress', simple: 'My steps', lowLevel: true },
    levelEyebrow: { standard: 'Your level', lowLevel: true },
    levelSuffix: { standard: 'of {max}' },
    levelProgress: {
      standard: '{passed} of {needed} stories passed to reach Level {next}.',
      simple: '{passed} of {needed} stories passed for Level {next}.',
    },
    levelProgressLabel: {
      standard: 'Progress to the next level',
      simple: 'Progress to next level',
    },
    wordsInfo: {
      standard:
        'Stories at this level have about {min} to {max} words. Higher levels have longer stories, harder words and fewer tries.',
      simple: 'Stories here have about {min} to {max} words.',
    },
  },

  read: {
    pageTitle: { standard: 'Read out loud', simple: 'Read out loud' },
    makingTitle: { standard: 'Making a story', simple: 'Getting your story' },
    makingBody: {
      standard: 'This can take up to a minute. A good story is worth the wait.',
      simple: 'This can take a minute.',
    },
    cancel: { standard: 'Cancel', lowLevel: true },
    mic: {
      title: { standard: 'Read the story out loud', simple: 'Read out loud', lowLevel: true },
      lead: {
        standard:
          'Your teacher will listen while you read. Press the button, then choose Allow when your browser asks about the microphone.',
        simple: 'Press the button. Then choose Allow.',
        lowLevel: true,
      },
      notice: {
        standard:
          'Find a quiet spot. Read at your own speed. Your voice is used to follow along and is not kept.',
        simple: 'Find a quiet spot. Read slowly.',
        lowLevel: true,
      },
      turnOn: { standard: 'Turn on microphone', simple: 'Turn on the mic', lowLevel: true },
      cannot: {
        standard: 'I cannot use a microphone',
        simple: 'I have no microphone',
        lowLevel: true,
      },
      waiting: { standard: 'Waiting for your browser', simple: 'Waiting', lowLevel: true },
      aria: { standard: 'Microphone' },
    },
    silent: {
      title: { standard: 'Read the story to yourself', simple: 'Read the story' },
      lead: {
        standard:
          'Your grown-up has not said yes to the microphone yet, so you will read silently for now. We will check again when they say yes.',
        simple: 'You will read without the mic for now.',
      },
      done: { standard: 'I finished reading', simple: 'I am done', lowLevel: true },
    },
    session: {
      listening: { standard: 'Listening', lowLevel: true },
      story: { standard: 'Story' },
      tryEyebrow: { standard: 'Tries' },
      tryOf: { standard: 'Try {n} of {total}', lowLevel: true },
      tryOnly: { standard: 'Try {n}', lowLevel: true },
      triesRule: {
        standard: 'Level {level} gives you {total} tries on each story.',
        simple: 'Level {level}: {total} tries each story.',
      },
      triesRuleUnlimited: {
        standard: 'Level {level} gives you as many tries as you need.',
        simple: 'Level {level}: try as many times as you need.',
      },
      meter: { standard: 'Microphone level' },
      finished: { standard: 'I am finished reading', simple: 'I am done', lowLevel: true },
      stopHere: { standard: 'Stop here', lowLevel: true },
      startAgain: { standard: 'Start again', lowLevel: true },
    },
    upload: {
      sending: { standard: 'Sending your reading', simple: 'Sending', lowLevel: true },
      slow: {
        standard: 'Connection is slow. Still trying.',
        simple: 'Slow connection. Still trying.',
      },
      done: { standard: 'All done', lowLevel: true },
      failed: {
        standard: 'Your reading could not be sent. Please try again.',
        simple: 'Could not send. Try again.',
      },
      analysing: { standard: 'Your teacher is listening back', simple: 'Checking your reading' },
      continue: { standard: 'See how you read', simple: 'See my reading', lowLevel: true },
    },
    problems: {
      tryAgain: { standard: 'Try again', lowLevel: true },
      back: { standard: 'Back', lowLevel: true },
      noMicNotice: {
        standard:
          'No microphone on this computer? You can still read stories and answer questions, but reading aloud and the AI reading analysis need a microphone.',
        simple: 'No microphone? You can still read stories and answer questions.',
      },
      denied: {
        title: { standard: 'The microphone is not on yet', simple: 'The mic is not on yet' },
        lead: {
          standard:
            'Your teacher needs to hear you read. Press Try again, then choose Allow when your browser asks.',
          simple: 'Press Try again. Then choose Allow.',
        },
      },
      blocked: {
        title: { standard: 'The microphone is turned off', simple: 'The mic is turned off' },
        lead: {
          standard:
            'Your teacher needs to hear you read. Turn the microphone on for this website, then try again.',
          simple: 'Turn the mic on for this website.',
        },
        step1: {
          standard: 'Click the lock or settings icon next to the web address.',
          simple: 'Click the lock next to the web address.',
        },
        step2: {
          standard: 'Find Microphone and choose Allow.',
          simple: 'Find Microphone. Choose Allow.',
        },
        step3: {
          standard: 'Come back here and press Try again.',
          simple: 'Come back. Press Try again.',
        },
      },
      noDevice: {
        title: { standard: 'No microphone found', simple: 'No mic found' },
        lead: {
          standard: 'Your teacher needs to hear you read. Plug in a microphone, then try again.',
          simple: 'Plug in a microphone. Then try again.',
        },
      },
      unavailable: {
        title: { standard: 'The microphone is busy', simple: 'The mic is busy' },
        lead: {
          standard: 'Another app or tab may be using the microphone. Close it, then try again.',
          simple: 'Close other apps that use the mic.',
        },
      },
      unsupported: {
        title: { standard: 'This browser cannot listen', simple: 'This browser cannot listen' },
        lead: {
          standard:
            'Reading aloud needs a newer browser on a secure page. Open BasaBridge in the latest Chrome, Safari or Edge.',
          simple: 'Open BasaBridge in a newer browser.',
        },
      },
      lost: {
        title: { standard: 'The microphone stopped', simple: 'The mic stopped' },
        lead: {
          standard:
            'The microphone was unplugged or turned off while you were reading. Check it, then try again.',
          simple: 'The mic stopped. Check it. Then try again.',
        },
      },
    },
    triesUsed: {
      title: { standard: 'You used all {count} tries', simple: 'You used all {count} tries' },
      body: {
        standard:
          'Your best try was Try {best}, and that one counts. Next you will answer the questions, then read a new story at the same level.',
        simple: 'Try {best} was your best. It counts. Now answer the questions.',
      },
      listTitle: { standard: 'Words read right on each try', simple: 'Words right on each try' },
      best: { standard: 'best' },
      answer: { standard: 'Answer the questions', simple: 'Answer questions', lowLevel: true },
    },
  },

  analysis: {
    pageTitle: { standard: 'How you read', simple: 'How you read' },
    doneTitle: { standard: 'You read to the end!', simple: 'You read it all!' },
    wordsRight: { standard: 'Words read right' },
    wordsRightValue: { standard: '{right} of {total}' },
    pace: { standard: 'Reading pace' },
    paceValue: { standard: '{wpm} words a minute' },
    triesTitle: { standard: 'Your tries on this story', simple: 'Your tries' },
    tryRow: { standard: 'Try {n}' },
    tryRowBest: { standard: 'Try {n}, best' },
    triesLeft: {
      standard:
        '{count, plural, one {# try left on this story.} other {# tries left on this story.}}',
      simple: '{count, plural, one {# try left.} other {# tries left.}}',
    },
    noTriesLeft: { standard: 'No tries left on this story.', simple: 'No tries left.' },
    noteTitle: { standard: 'What your teacher noticed', simple: 'Your teacher noticed' },
    noNote: {
      standard: 'Your teacher has no note for this try.',
      simple: 'No note for this try.',
    },
    wordsToPractise: { standard: 'Words to practise' },
    wordTapHint: {
      standard: 'Tap a word to hear it.',
      simple: 'Tap a word to hear it.',
    },
    wordTapWord: { standard: 'Hear “{word}”', simple: 'Hear “{word}”' },
    misheardLead: {
      standard:
        'I could not hear these words clearly. If I got one wrong, tap it and I will fix it.',
      simple: 'I could not hear these words. Tap one if I was wrong.',
    },
    misheardThanks: { standard: 'Thanks. I will fix it.', simple: 'Thanks. I will fix it.' },
    misheardWord: { standard: 'Tap “{word}” if you read it right', simple: 'Tap “{word}”' },
    markFailed: {
      standard: 'We could not save that. Please try again.',
      simple: 'Could not save. Try again.',
    },
    reviewNotice: {
      standard:
        'There was background noise or other voices on this try, so it will not count until it is checked. Try again in a quiet place.',
      simple: 'There was noise. This try may not count. Try in a quiet place.',
    },
    answer: { standard: 'Answer the questions', simple: 'Answer questions', lowLevel: true },
    tryAgain: {
      standard: 'Try again ({count} left)',
      simple: 'Try again ({count} left)',
    },
    tryAgainUnlimited: { standard: 'Try again', lowLevel: true },
    stopped: {
      title: { standard: 'We heard you stop at “{word}”', simple: 'You stopped at “{word}”' },
      lead: {
        standard:
          'There is a little more to read. Let us finish the story before the questions. This counts as try {n} of {total} only when you reach the end.',
        simple: 'Finish the story first. This is try {n} of {total}.',
      },
      leadUnlimited: {
        standard: 'There is a little more to read. Let us finish the story before the questions.',
        simple: 'There is more to read. Finish the story first.',
      },
      rest: { standard: 'Read the rest', lowLevel: true },
      top: { standard: 'Start from the top', lowLevel: true },
    },
  },

  questions: {
    pageTitle: { standard: 'Question', simple: 'Question' },
    stepLabel: { standard: 'Question {n} of {total}', simple: 'Question {n} of {total}' },
    steps: { standard: 'Questions' },
    hint: { standard: 'Answer from what you remember.', simple: 'Think about the story.' },
    choose: { standard: 'Choose an answer to continue', simple: 'Choose an answer' },
    check: { standard: 'Check my answer', simple: 'Check', lowLevel: true },
    checking: { standard: 'Checking', lowLevel: true },
    choices: { standard: 'Answers' },
    listen: { standard: 'Listen to the question and answers', simple: 'Listen' },
    listenShort: { standard: 'Listen', lowLevel: true },
    listenStop: { standard: 'Stop listening', simple: 'Stop', lowLevel: true },
    saveFailed: {
      standard: 'We could not check that answer. Please try again.',
      simple: 'Could not check. Try again.',
    },
    correct: { standard: 'Yes! That is right.', simple: 'Yes! Right.' },
    wrong: {
      standard: 'Not quite. The answer is {letter}: {answer}.',
      simple: 'Not quite. The answer is {letter}: {answer}.',
    },
    statusCorrect: { standard: 'Correct answer' },
    statusWrong: { standard: 'Your answer, not correct' },
    statusRight: { standard: 'The right answer' },
    next: { standard: 'Next question', simple: 'Next', lowLevel: true },
    seeResult: { standard: 'See my result', simple: 'My result', lowLevel: true },
    learn: { standard: 'Learn about this', simple: 'Learn this', lowLevel: true },
    doneTitle: { standard: 'All the questions are answered', simple: 'All answered' },
  },

  result: {
    pageTitle: { standard: 'Your result', simple: 'Your result' },
    answered: { standard: 'You answered {right} of {total}', simple: 'You got {right} of {total}' },
    readToEnd: { standard: 'Read to the end', lowLevel: true },
    notReadToEnd: { standard: 'Did not read to the end' },
    silent: { standard: 'Read silently' },
    wordsRight: { standard: 'Words read right {pct}%', simple: 'Words right {pct}%' },
    skillsTitle: { standard: 'What you answered' },
    skillRow: { standard: '{right}/{total}' },
    passed: { standard: 'This story passed.', simple: 'You passed.' },
    notPassed: { standard: 'This story did not pass.', simple: 'Not passed this time.' },
    inARow: { standard: '{passed} of {needed} passed!', simple: '{passed} of {needed} passed' },
    inARowLabel: { standard: 'Stories passed toward the next level' },
    newLevel: { standard: 'You reached Level {level}.', simple: 'You reached Level {level}.' },
    changedLevel: {
      standard: 'You are now at Level {level}.',
      simple: 'You are at Level {level}.',
    },
    seeNewLevel: { standard: 'See my new level', simple: 'My new level', lowLevel: true },
    done: { standard: 'I am done', lowLevel: true },
    another: { standard: 'Read another story', simple: 'Read a story', lowLevel: true },
    learnOffer: {
      standard: 'Practice {skill} in Learn.',
      simple: 'Practice {skill} in Learn.',
    },
    learnLink: { standard: 'Go to Learn', simple: 'Learn', lowLevel: true },
    nothingBody: {
      standard: 'Read a story and answer the questions. Your result will show here.',
      simple: 'Read a story first.',
    },
    nothingAction: { standard: 'Read a story', lowLevel: true },
  },

  levelUp: {
    pageTitle: { standard: 'Level up', simple: 'Level up' },
    eyebrow: { standard: 'New level', lowLevel: true },
    passedRow: {
      standard: 'You passed {count} stories in a row',
      simple: 'You passed {count} stories in a row',
    },
    newTitle: { standard: 'What is new at Level {level}', simple: 'New at Level {level}' },
    words: { standard: 'Stories have about {min} to {max} words' },
    harder: {
      standard: 'A few harder words, explained by the story around them',
      simple: 'A few harder words',
    },
    triesSame: { standard: 'You still get {count} tries on each story' },
    triesNow: { standard: 'You now get {count} tries on each story' },
    triesNext: {
      standard: 'At Level {level} you will get {count} tries on each story.',
      simple: 'At Level {level} you get {count} tries.',
    },
    read: { standard: 'Read a new story', simple: 'Read a story', lowLevel: true },
  },

  placement: {
    intro: {
      eyebrow: { standard: 'Welcome', lowLevel: true },
      title: { standard: 'Let us find your starting level', simple: 'Find your level' },
      lead: {
        standard:
          'Read a few short stories and answer questions. This shows where to start so the stories are not too hard or too easy. It takes about 10 minutes.',
        simple: 'Read a few short stories. It takes about 10 minutes.',
      },
      start: { standard: 'Start', lowLevel: true },
      later: { standard: 'Do this later', simple: 'Later', lowLevel: true },
      laterNote: {
        standard: 'If you do it later, we start you at an easy level for your grade and ask again.',
        simple: 'If you wait, we start you at an easy level.',
      },
      whatTitle: { standard: 'What will happen', simple: 'What happens' },
      step1: { standard: 'Read a story out loud', simple: 'Read a story' },
      step2: { standard: 'Answer questions about it', simple: 'Answer questions' },
      step3: { standard: 'Get your starting level', simple: 'Get your level' },
      rules: {
        standard:
          'You read each story once. There are no hints in this test. You can stop and come back.',
        simple: 'You read each story once. You can stop and come back.',
      },
      silentNotice: {
        standard:
          'Your grown-up has not said yes to the microphone yet, so you will read silently for now. We will check again when they say yes.',
        simple: 'No microphone for now. You will read silently.',
      },
      failed: {
        standard: 'We could not do that. Please try again.',
        simple: 'Could not do that. Try again.',
      },
    },
    between: {
      eyebrow: { standard: 'Finding your starting level', simple: 'Finding your level' },
      story: { standard: 'Story {n}', lowLevel: true },
      title: { standard: 'Nice reading! One more story.', simple: 'Nice reading! One more.' },
      body: {
        standard:
          'We are still finding the right level for you. This next story may be a little easier or a little harder.',
        simple: 'The next story may be easier or harder.',
      },
      next: { standard: 'Next story', lowLevel: true },
      stop: { standard: 'Stop and come back later', simple: 'Stop for now' },
      saved: { standard: 'We save your place.', simple: 'We save your place.' },
    },
    result: {
      eyebrow: { standard: 'Finding your starting level', simple: 'Finding your level' },
      title: { standard: 'Your starting level', simple: 'Your level', lowLevel: true },
      good: {
        standard: 'This is a good place to start. You move up as you read.',
        simple: 'A good place to start. You move up as you read.',
      },
      guess: {
        standard:
          'We could not hear you read, so this level is a first guess. It will change as you read.',
        simple: 'This level is a first guess.',
      },
      start: { standard: 'Start reading', lowLevel: true },
      retake: {
        standard: 'You can take this test again after {days} days.',
        simple: 'You can try again in {days} days.',
      },
      noticed: { standard: 'What we noticed', simple: 'What we saw' },
      strong: { standard: 'Good at {skill}' },
      practise: { standard: 'Practice: {skill}' },
      learnNote: {
        standard: 'The Learn section can help with {skill} whenever you want.',
        simple: 'Learn can help with {skill}.',
      },
      learnLink: { standard: 'See Learn', lowLevel: true },
      helpTitle: { standard: 'More help is turned on', simple: 'More help is on' },
      helpBody: {
        standard:
          'Spoken instructions, bigger text and a reading ruler. You can change any of these.',
        simple: 'Spoken words, bigger text and a ruler.',
      },
      helpLink: { standard: 'Change reading help', simple: 'Change help' },
    },
  },
} as const satisfies Catalog;
