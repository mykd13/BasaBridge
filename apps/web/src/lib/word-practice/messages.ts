/**
 * Interface text for word practice, in English and Filipino, simple and standard wording.
 * Stand-in for the shared i18n catalog, which is not on main yet: move these keys into it when it lands.
 * Filipino text needs a native-speaker review (see BB-57).
 */
export type Lang = 'en' | 'fil';
export type Wording = 'simple' | 'standard';

export interface Messages {
  title: string;
  progress: (n: number, total: number) => string;
  leave: string;
  listen: string;
  listenSlowly: string;
  sayIt: string;
  stop: string;
  checking: string;
  praise: (word: string) => { lead: string; rest: string };
  retry: string;
  unscored: string;
  nextWord: string;
  done: string;
  note: string;
  emptyTitle: string;
  emptyBody: string;
  back: string;
}

const en: Record<Wording, Messages> = {
  standard: {
    title: 'Say it',
    progress: (n, total) => `Word ${n} of ${total}`,
    leave: 'Leave',
    listen: 'Listen',
    listenSlowly: 'Hear it slowly',
    sayIt: 'Say it',
    stop: 'Done',
    checking: 'Listening…',
    praise: (word) => ({ lead: 'Great!', rest: `We heard “${word}”.` }),
    retry: 'Nice try. Want to go again? You can hear it slowly first.',
    unscored:
      'The microphone is off, so we will not score this. Listen, then say the word out loud.',
    nextWord: 'Next word',
    done: 'All done',
    note: 'You can tap Listen as often as you like. We never keep your voice from this practice.',
    emptyTitle: 'No words to practise yet',
    emptyBody: 'Words from your reading will show up here.',
    back: 'Back to Learn',
  },
  simple: {
    title: 'Say it',
    progress: (n, total) => `Word ${n} of ${total}`,
    leave: 'Leave',
    listen: 'Listen',
    listenSlowly: 'Slow',
    sayIt: 'Say it',
    stop: 'Done',
    checking: 'Listening…',
    praise: (word) => ({ lead: 'Great!', rest: `We heard “${word}”.` }),
    retry: 'Nice try. Go again?',
    unscored: 'Mic is off. Listen, then say it.',
    nextWord: 'Next word',
    done: 'All done',
    note: 'Tap Listen any time. We never keep your voice.',
    emptyTitle: 'No words yet',
    emptyBody: 'Words from your reading go here.',
    back: 'Back',
  },
};

const fil: Record<Wording, Messages> = {
  standard: {
    title: 'Sabihin mo',
    progress: (n, total) => `Salita ${n} sa ${total}`,
    leave: 'Umalis',
    listen: 'Pakinggan',
    listenSlowly: 'Pakinggan nang mabagal',
    sayIt: 'Sabihin mo',
    stop: 'Tapos na',
    checking: 'Nakikinig…',
    praise: (word) => ({ lead: 'Magaling!', rest: `Narinig namin ang “${word}”.` }),
    retry: 'Magaling ang try. Subukan ulit? Pakinggan muna nang mabagal.',
    unscored:
      'Patay ang mikropono, kaya hindi namin ito bibigyan ng marka. Makinig, saka sabihin ang salita nang malakas.',
    nextWord: 'Susunod na salita',
    done: 'Tapos na lahat',
    note: 'Pwede mong pindutin ang Pakinggan kahit ilang beses. Hindi namin iniingatan ang boses mo sa pagsasanay na ito.',
    emptyTitle: 'Wala pang salitang pagsasanayan',
    emptyBody: 'Lalabas dito ang mga salita mula sa pagbasa mo.',
    back: 'Bumalik sa Learn',
  },
  simple: {
    title: 'Sabihin mo',
    progress: (n, total) => `Salita ${n} sa ${total}`,
    leave: 'Umalis',
    listen: 'Pakinggan',
    listenSlowly: 'Mabagal',
    sayIt: 'Sabihin mo',
    stop: 'Tapos na',
    checking: 'Nakikinig…',
    praise: (word) => ({ lead: 'Magaling!', rest: `Narinig namin ang “${word}”.` }),
    retry: 'Magaling! Ulit tayo?',
    unscored: 'Patay ang mikropono. Makinig, saka sabihin.',
    nextWord: 'Susunod',
    done: 'Tapos na',
    note: 'Pindutin ang Pakinggan kahit kailan. Hindi namin iniingatan ang boses mo.',
    emptyTitle: 'Wala pang salita',
    emptyBody: 'Dito lalabas ang mga salita mula sa pagbasa.',
    back: 'Bumalik',
  },
};

export function messagesFor(lang: Lang, wording: Wording): Messages {
  return (lang === 'fil' ? fil : en)[wording];
}
