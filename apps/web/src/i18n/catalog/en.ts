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
  parent: {
    nav: {
      label: { standard: 'Sections for this child' },
      progress: { standard: 'Progress' },
      readings: { standard: 'Readings' },
      levels: { standard: 'Levels and tries' },
      decisions: { standard: 'AI decisions' },
      privacy: { standard: 'Data and privacy' },
    },
    titles: {
      progress: { standard: 'Progress' },
      readings: { standard: 'Readings and AI analysis' },
      levels: { standard: 'Levels and tries' },
      decisions: { standard: 'AI decisions' },
      privacy: { standard: 'Linked children and privacy' },
    },
    sections: {
      progress: { standard: 'Progress' },
      readings: { standard: 'Readings' },
      levels: { standard: 'Level history' },
      decisions: { standard: 'AI decisions' },
    },
    summary: {
      grade: { standard: 'Grade {grade}' },
      level: { standard: 'Level {level} of {max}' },
      readings: { standard: '{count, plural, one {# reading} other {# readings}}' },
      sharedSince: {
        standard: 'Shared since {date}. Your child controls what you see.',
      },
    },
    states: {
      emptyTitle: { standard: 'Nothing to show yet' },
      empty: {
        progress: {
          standard: 'Progress appears here after your child reads a story out loud and answers.',
        },
        readings: { standard: 'Each reading appears here after your child finishes a story.' },
        levels: { standard: 'Level changes appear here as your child reads stories.' },
        decisions: { standard: 'Decisions appear here after your child reads a story.' },
        privacy: { standard: 'No children are linked to your account yet.' },
      },
      notSharedTitle: { standard: '{section} is not shared with you' },
      notSharedBody: {
        standard:
          'Your child has not shared this with you. You see only what they choose to share.',
      },
      notSharedStep: {
        standard:
          'To see it, ask your child to open Share with a parent in their account and turn this section on.',
      },
      errorTitle: { standard: 'We could not load this page' },
      errorBody: { standard: 'Something went wrong on our side. Please try again.' },
      retry: { standard: 'Try again' },
    },
    skills: {
      decoding: {
        name: { standard: 'Decoding' },
        about: { standard: 'Sounding out words accurately' },
      },
      fluency: {
        name: { standard: 'Fluency' },
        about: { standard: 'Reading smoothly at a steady pace' },
      },
      vocabulary: {
        name: { standard: 'Vocabulary' },
        about: { standard: 'Knowing what words mean in context' },
      },
      literal: {
        name: { standard: 'Literal comprehension' },
        about: { standard: 'Finding what the text says directly' },
      },
      inferential: {
        name: { standard: 'Inferential comprehension' },
        about: { standard: 'Working out what the text suggests' },
      },
    },
    confidence: {
      none: { standard: 'No evidence yet' },
      early: { standard: 'Early signs' },
      building: { standard: 'Building a picture' },
      steady: { standard: 'Steady evidence' },
    },
    progress: {
      level: {
        eyebrow: { standard: 'Level' },
        of: { standard: 'of {max}' },
        progressLabel: { standard: 'Stories passed at this level' },
        progressText: {
          standard: '{passes} of {needed} stories passed toward Level {next}',
        },
        top: { standard: 'This is the top level.' },
      },
      tries: {
        title: { standard: 'Tries per story' },
        unlimited: { standard: 'Unlimited' },
        next: { standard: 'Changes to {tries} at Level {level}.' },
      },
      averageTries: {
        title: { standard: 'Tries used on average' },
        note: {
          standard: 'Across the last {count, plural, one {# story} other {# stories}}',
        },
        none: { standard: 'No stories yet' },
      },
      skills: {
        title: { standard: 'Reading skills' },
        intro: {
          standard:
            'Estimates come only from what your child read and answered, weighted toward recent readings.',
        },
        wordsRight: { standard: '{right} of {total} words read right' },
        correct: { standard: '{right} of {total} correct' },
        pace: { standard: 'words read right per minute' },
        up: { standard: 'Up {delta} since the last reading' },
        down: { standard: 'Down {delta} since the last reading' },
      },
      patterns: {
        title: { standard: 'Reading patterns the AI Teacher found' },
        intro: {
          standard: 'From word-by-word comparison of your child’s voice to the text.',
        },
        none: { standard: 'No patterns found yet. They appear when the same thing repeats.' },
        counts: {
          standard:
            'Seen {count, plural, one {# time} other {# times}} in {tries, plural, one {# reading} other {# readings}}.',
        },
        dropped_ending: { standard: 'Often leaves off word endings such as “-{key}”.' },
        letter_pattern: { standard: 'Slows down on words with “{key}”.' },
        repeated_substitution: { standard: 'Often reads “{from}” as “{to}”.' },
        missing_pause: { standard: 'Reads straight through full stops without pausing.' },
        confidence: {
          low: { standard: 'Low confidence' },
          medium: { standard: 'Medium confidence' },
          high: { standard: 'High confidence' },
        },
        mishear: {
          standard:
            'Speech recognition can mishear some voices and accents. Check the word list under Readings.',
        },
      },
      plan: {
        title: { standard: 'Current plan' },
        last: {
          standard:
            'This reading: {correct} of {total} questions correct and {percent}% of words read right.',
        },
        lastNoVoice: {
          standard: 'This reading: {correct} of {total} questions correct. No voice result.',
        },
        next: { standard: 'The next story will be new text.' },
        focus: {
          standard:
            'Focus: {skill}. It is the lowest measured comprehension skill so far ({right} of {total} correct).',
        },
        focusNone: {
          standard: 'No focus yet. It is chosen once there are enough answers.',
        },
        rule: {
          standard:
            'The focus is chosen by rule, from the lowest estimate. The AI Teacher does not choose it.',
        },
      },
      notes: {
        title: { standard: 'Home activity' },
        notReady: {
          standard: 'The AI Teacher’s notes are not ready yet. This is the standard activity.',
        },
        ai: { standard: 'Written by the AI Teacher' },
        standardActivity: { standard: 'Standard activity' },
        minutes: { standard: '{minutes, plural, one {# minute} other {# minutes}}' },
        tip: { standard: 'Tip: {tip}' },
      },
      limits: {
        title: { standard: 'What this does and does not tell you.' },
        body: {
          standard:
            'Each reading has about five questions and one voice sample, so early numbers can move a lot. This supports reading practice. It is not a diagnosis, a grade, or a replacement for school, and a few readings cannot show lasting learning gains.',
        },
      },
    },
    readings: {
      list: { standard: 'Readings' },
      when: { standard: '{date}' },
      level: { standard: 'Level {level}' },
      result: {
        standard: '{correct} of {total} questions · {percent}% of words read right',
      },
      resultNoVoice: { standard: '{correct} of {total} questions · no voice result' },
      tries: {
        title: { standard: 'Tries on this story' },
        number: { standard: 'Try' },
        done: { standard: 'Read to the end' },
        words: { standard: 'Words right' },
        pace: { standard: 'Pace' },
        yes: { standard: 'Yes' },
        no: { standard: 'No' },
        counted: { standard: '{number} (counted)' },
        wordsCell: { standard: '{right} of {total} ({percent}%)' },
        paceCell: { standard: '{wpm} words a minute' },
        scroll: { standard: 'Tries table' },
      },
      words: {
        title: { standard: 'Words to check on the counted try' },
        said: { standard: 'Text said' },
        heard: { standard: 'Heard' },
        sure: { standard: 'How sure' },
        none: { standard: 'No words to check on this try.' },
        nothing: { standard: 'nothing' },
        marked: { standard: 'Marked as heard wrongly' },
        high: { standard: 'High' },
        medium: { standard: 'Medium' },
        low: { standard: 'Low, audio unclear' },
        scroll: { standard: 'Words to check' },
      },
      analysis: {
        title: { standard: 'AI Teacher’s analysis' },
        based: {
          standard:
            'Based on {count, plural, one {# word-level difference} other {# word-level differences}} between the voice and the text.',
        },
        ai: { standard: 'Written by the AI Teacher' },
        standardWording: { standard: 'Standard wording' },
        none: { standard: 'There is no analysis for this reading yet.' },
      },
      questions: {
        title: { standard: 'Questions' },
        correct: { standard: 'Correct' },
        missed: { standard: 'Missed' },
        chose: { standard: 'Chose: {chosen}' },
        answer: { standard: 'Answer: {answer}' },
        evidence: { standard: 'From the story: “{evidence}”' },
      },
    },
    levels: {
      intro: {
        standard:
          'There are {max} levels. As the level rises, stories get longer and harder, and tries per story go down.',
      },
      table: {
        title: { standard: 'How levels work' },
        levels: { standard: 'Levels' },
        length: { standard: 'Story length' },
        words: { standard: 'Words and sentences' },
        tries: { standard: 'Tries per story' },
        range: { standard: '{from} to {to}' },
        wordsRange: { standard: '{min} to {max} words' },
        here: { standard: 'Your child is here, Level {level}' },
        scroll: { standard: 'Levels, story length and tries' },
      },
      tier: {
        one: { standard: 'Everyday words and very short sentences' },
        two: { standard: 'Everyday words, a few new ones explained by the story' },
        three: { standard: 'Sentences joined with “and”, “but” and “because”, some topic words' },
        four: { standard: 'Varied sentences, several topic words' },
        five: { standard: 'Longer sentences, subject words, details to connect' },
        six: { standard: 'Advanced vocabulary and figurative language' },
      },
      history: {
        title: { standard: 'Level history' },
        placement: { standard: 'Started at Level {to}' },
        up: { standard: 'Moved up from Level {from} to Level {to}' },
        down: { standard: 'Moved down from Level {from} to Level {to}' },
        list: { standard: 'Level changes, newest first' },
      },
      tries: {
        title: { standard: 'How tries work' },
        one: {
          standard:
            'A try is one read-aloud of the story. After each try the AI Teacher shows what to fix, and your child can read again if tries are left.',
        },
        two: {
          standard:
            'When the tries are used up, one try counts toward the result, your child answers the questions, and then gets a new story at the same difficulty.',
        },
      },
      pass: {
        title: { standard: 'How a level is passed' },
        story: {
          standard:
            'A story passes when your child reads at least {words}% of the words right on the counted try and answers at least {correct} of {total} questions correctly.',
        },
        move: {
          standard:
            'Passing {passes} stories at a level counts toward moving up, and the answers must also show your child is ready. A very weak result ({share}% of questions right or fewer) can move a level down by one so stories stay readable.',
        },
        evidence: {
          standard:
            'A level moves only on evidence from stories read at the current level. Practice in Learn never changes a level.',
        },
        tune: {
          standard:
            'These numbers are the starting rules. They can be tuned as real results come in.',
        },
      },
    },
    decisions: {
      intro: {
        standard:
          'You are the human check on these. Counts and levels are worked out in code, not guessed.',
      },
      list: { standard: 'Decisions, newest first' },
      kinds: {
        story: { standard: 'Story' },
        level: { standard: 'Level' },
        plan: { standard: 'Plan' },
        analysis: { standard: 'Reading analysis' },
        tries: { standard: 'Tries' },
      },
      basedOn: { standard: 'Based on {title}' },
      messages: {
        analysis: {
          title: { standard: 'Story answers counted' },
          body: {
            standard:
              '{answers, plural, one {# answer was} other {# answers were}} counted, {reduced} counted for less.',
          },
        },
        levelUp: {
          title: { standard: 'Moved up to Level {level}' },
          body: {
            standard:
              'Stories at this level showed enough evidence. The rule moved the level, not the AI.',
          },
        },
        levelDown: {
          title: { standard: 'Moved down to Level {level}' },
          body: {
            standard: 'This level looked too hard for now. The rule moved the level, not the AI.',
          },
        },
        focus: {
          title: { standard: 'Focus skill is now {skill}' },
          body: {
            standard:
              'It has the lowest estimate of the three comprehension skills. A rule chose it.',
          },
        },
      },
    },
    privacy: {
      children: {
        title: { standard: 'Linked children' },
        sharing: { standard: 'Sharing: {sections}' },
        sharingNone: { standard: 'Not sharing anything yet' },
        linked: { standard: 'Linked {date}' },
        given_by_parent: { standard: 'Microphone approval: given by you' },
        not_needed: { standard: 'Microphone approval: not needed' },
        pending: { standard: 'Microphone approval: waiting for you' },
        link: { standard: 'Link a child' },
        own: {
          standard:
            'Your child owns their account. You can stop viewing at any time. Your child can also stop sharing.',
        },
      },
      voice: {
        title: { standard: 'Voice and audio' },
        one: {
          standard:
            'While your child reads aloud, their voice is turned into text and compared with the story. The audio is then discarded.',
        },
        two: {
          standard:
            'Keeping recordings is your child’s choice in their own account. Parents never see or hear recordings.',
        },
      },
      data: {
        title: { standard: 'Privacy' },
        whoLabel: { standard: 'Who can see results.' },
        who: { standard: 'Your child and, because they shared it, you. Nobody else.' },
        aiLabel: { standard: 'What the AI model sees.' },
        ai: {
          standard:
            'Reading levels, story text, question text and word-level differences. Never your child’s name, username or audio.',
        },
        ownLabel: { standard: 'Your own data.' },
        own: {
          standard:
            'Your parent account holds only your name, email and which children you are linked to.',
        },
      },
      actionsNotReady: {
        title: { standard: 'Some account tools are not ready yet' },
        body: {
          standard:
            'Stopping viewing, downloading your parent data and deleting your parent account will appear here when they are ready.',
        },
      },
    },
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
  progress: {
    level: { standard: 'My level', simple: 'My level' },
    levelOf: { standard: 'of {max}' },
    levelBar: { standard: 'Progress to the next level', simple: 'Steps to the next level' },
    toNext: {
      standard:
        '{count, plural, one {# more story to reach Level {level}} other {# more stories to reach Level {level}}}',
      simple:
        '{count, plural, one {# more story to Level {level}} other {# more stories to Level {level}}}',
    },
    topLevel: { standard: 'You are at the top level.', simple: 'You are at the top.' },
    focus: { standard: 'What to work on next', simple: 'Work on this next' },
    focusNone: {
      standard: 'Read a few more stories and we will pick a skill for you.',
      simple: 'Read more stories to get a skill.',
    },
    recent: { standard: 'Recent stories', simple: 'My stories' },
    recentNone: {
      standard: 'Your stories will show up here after you finish one.',
      simple: 'Finished stories show up here.',
    },
    score: { standard: '{correct} of {total}' },
    scoreLabel: {
      standard: '{correct} of {total} questions right',
      simple: '{correct} of {total} right',
    },
    empty: {
      title: { standard: 'No stories yet', simple: 'No stories yet' },
      body: {
        standard: 'Read your first story and your progress will show up here.',
        simple: 'Read a story to see your steps here.',
      },
      action: { standard: 'Go to Home', simple: 'Go Home' },
    },
    skills: {
      vocabulary: { standard: 'Word meanings' },
      literal: { standard: 'Finding facts' },
      inferential: { standard: 'Reading between the lines' },
    },
  },
  language: {
    label: { standard: 'Language', simple: 'Language' },
    en: { standard: 'English' },
    fil: { standard: 'Filipino' },
  },
} as const satisfies Catalog;
