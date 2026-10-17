/**
 * Every learner-facing string on the reading microphone screens, in one keyed place.
 * The English and Filipino catalog with simple and standard wording (BB-58) will replace this module.
 * Wording follows design canvas B2 (S4-Mic) and D3 (S13-MicBlocked).
 */
export const copy = {
  brand: 'BasaBridge',
  micAria: 'Microphone',
  meterAria: 'Microphone level',

  ready: {
    title: 'Read the story out loud',
    lead: 'Your teacher will listen while you read. Press the button, then choose Allow when your browser asks about the microphone.',
    notice:
      'Find a quiet spot. Read at your own speed. Your voice is used to follow along and is not kept.',
    turnOn: 'Turn on microphone',
    cannot: 'I cannot use a microphone',
    waiting: 'Waiting for your browser',
  },

  recording: {
    title: 'Listening',
    stop: 'Stop',
    startAgain: 'Start again',
  },

  upload: {
    sending: 'Sending your reading',
    slow: 'Connection is slow. Still trying.',
    done: 'All done',
    failed: 'Your reading could not be sent. Please try again.',
  },

  /** Canvas D3, with the help text matched to what actually went wrong. */
  problems: {
    denied: {
      title: 'The microphone is not on yet',
      lead: 'Your teacher needs to hear you read. Press Try again, then choose Allow when your browser asks.',
      steps: [] as string[],
    },
    blocked: {
      title: 'The microphone is turned off',
      lead: 'Your teacher needs to hear you read. Turn the microphone on for this website, then try again.',
      steps: [
        'Click the lock or settings icon next to the web address.',
        'Find Microphone and choose Allow.',
        'Come back here and press Try again.',
      ],
    },
    'no-device': {
      title: 'No microphone found',
      lead: 'Your teacher needs to hear you read. Plug in a microphone, then try again.',
      steps: [] as string[],
    },
    unavailable: {
      title: 'The microphone is busy',
      lead: 'Another app or tab may be using the microphone. Close it, then try again.',
      steps: [] as string[],
    },
    unsupported: {
      title: 'This browser cannot listen',
      lead: 'Reading aloud needs a newer browser on a secure page. Open BasaBridge in the latest Chrome, Safari or Edge.',
      steps: [] as string[],
    },
    lost: {
      title: 'The microphone stopped',
      lead: 'The microphone was unplugged or turned off while you were reading. Check it, then try again.',
      steps: [] as string[],
    },
  },
  noMicNotice:
    'No microphone on this computer? You can still read stories and answer questions, but reading aloud and the AI reading analysis need a microphone.',
  tryAgain: 'Try again',
  back: 'Back',
} as const;

export type ProblemKey = keyof typeof copy.problems;
