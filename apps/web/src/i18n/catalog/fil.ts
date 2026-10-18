import type { SameShape } from '../types.ts';
import type { en } from './en.ts';

/**
 * Filipino wording. Every key starts with reviewed: false until a native speaker checks it.
 * See docs/i18n.md.
 */
export const fil = {
  app: {
    name: { standard: 'BasaBridge', reviewed: false },
    tagline: {
      standard: 'Magbasa nang malakas. Umunawa nang mas mabuti.',
      simple: 'Magbasa nang malakas.',
      spoken: true,
      lowLevel: true,
      reviewed: false,
    },
  },
  home: {
    levelOne: {
      standard: 'Ang mga kuwento sa Antas {level} ay {min} hanggang {max} salita na may {tries}.',
      reviewed: false,
    },
    tries: {
      standard: '{count, plural, one {# subok} other {# na subok}}',
      reviewed: false,
    },
    triesUnlimited: { standard: 'walang limitasyong subok', reviewed: false },
  },
  learn: {
    title: { standard: 'Matuto', reviewed: false },
    listenPage: { standard: 'Pakinggan ang pahinang ito', reviewed: false },
    empty: {
      standard:
        'Wala pang aralin. Pagkatapos mong magbasa ng kuwento at magkamali sa ilang tanong, lalabas dito ang mga aralin na makakatulong.',
      simple: 'Lalabas ang mga aralin pagkatapos ng kuwento.',
      reviewed: false,
    },
    leave: { standard: 'Bumalik', reviewed: false },
    emptyAction: { standard: 'Magbasa ng kuwento', reviewed: false },
    recommended: { standard: 'Inirerekomenda para sa iyo', reviewed: false },
    notFound: { standard: 'Hindi namin makita ang araling iyon.', reviewed: false },
    backToLearn: { standard: 'Bumalik sa Matuto', reviewed: false },
    status: {
      new: { standard: 'Bago', reviewed: false },
      waitingForStory: { standard: 'Naghihintay ng susunod mong kuwento', reviewed: false },
      learned: { standard: 'Natutunan na', reviewed: false },
    },
    card: {
      waiting: {
        standard:
          'Tapos na. {count, plural, one {# tanong na pagsusuri} other {# tanong na pagsusuri}} ang darating sa susunod mong kuwento.',
        reviewed: false,
      },
      learned: {
        standard: 'Tama ang sagot mo sa mga tanong na pagsusuri sa huli mong kuwento.',
        reviewed: false,
      },
      open: { standard: 'Buksan ang aralin: {title}', reviewed: false },
    },
    group: {
      vocabulary: { standard: 'Kahulugan ng mga salita', reviewed: false },
      literal: { standard: 'Mga detalye at pagkakasunod-sunod', reviewed: false },
      inferential: { standard: 'Pag-iisip tungkol sa kuwento', reviewed: false },
      decoding: { standard: 'Maayos na pagbasa', reviewed: false },
      wordPractice: { standard: 'Mahihirap na salita', reviewed: false },
    },
    subject: {
      word_in_context: { standard: 'kahulugan ng mga salita', reviewed: false },
      word_parts: { standard: 'mga bahagi ng salita', reviewed: false },
      key_detail: { standard: 'mahahalagang detalye', reviewed: false },
      sequence: { standard: 'ang pagkakasunod-sunod ng nangyari', reviewed: false },
      main_idea: { standard: 'ang pangunahing ideya', reviewed: false },
      cause_effect: { standard: 'kung bakit may nangyayari', reviewed: false },
      feelings: { standard: 'ang nararamdaman ng tauhan', reviewed: false },
      prediction: { standard: 'ang susunod na mangyayari', reviewed: false },
      conclusion: { standard: 'ang ipinapakita ng mga pahiwatig', reviewed: false },
      decoding: { standard: 'maayos na pagbasa ng mga salita', reviewed: false },
      word_practice: { standard: 'mahihirap na salita', reviewed: false },
    },
    result: {
      learnButton: { standard: 'Matuto', reviewed: false },
      readNew: { standard: 'Magbasa ng bagong kuwento', reviewed: false },
      teachTitle: { standard: 'Ang ituturo ng Matuto', reviewed: false },
      reason: {
        standard:
          'Nagkamali ka sa {count, plural, one {# tanong} other {# na tanong}} tungkol sa {skill}.',
        reviewed: false,
      },
      reasonNoCount: { standard: 'Makakatulong ang araling ito sa {skill}.', reviewed: false },
      note: {
        standard:
          'Hindi nagbabago ang antas mo dahil sa pag-aaral dito. Susuriin ng susunod mong kuwento kung ano ang natatandaan mo.',
        simple: 'Hindi nagbabago ang antas mo sa Matuto.',
        reviewed: false,
      },
    },
    link: { aboutThis: { standard: 'Alamin ang tungkol dito', reviewed: false } },
    lesson: {
      kicker: { standard: 'Aralin · {group}', reviewed: false },
      goal: { standard: 'Layunin: {goal}', reviewed: false },
      trick: { standard: 'Ang paraan', reviewed: false },
      example: { standard: 'Halimbawa', reviewed: false },
      listen: { standard: 'Pakinggan ang hakbang na ito', reviewed: false },
      next: { standard: 'Susunod', reviewed: false },
      back: { standard: 'Bumalik', reviewed: false },
      tryIt: { standard: 'Susunod: subukan', reviewed: false },
      finish: { standard: 'Tapusin', reviewed: false },
      step: { standard: 'Hakbang {current} sa {total}', reviewed: false },
    },
    practice: {
      readThis: { standard: 'Basahin ito', reviewed: false },
      listenQuestion: { standard: 'Pakinggan ang tanong', reviewed: false },
      tapWord: { standard: 'Pindutin ang salita para marinig ito.', reviewed: false },
      item: { standard: 'Tanong {current} sa {total}', reviewed: false },
      hint: { standard: 'Pahiwatig', reviewed: false },
      yes: { standard: 'Tama!', reviewed: false },
      notQuite: { standard: 'Medyo hindi pa. Subukan ang ibang sagot.', reviewed: false },
      answerIs: { standard: 'Ang sagot ay: {answer}', reviewed: false },
      next: { standard: 'Susunod', reviewed: false },
      finish: { standard: 'Tapusin ang pagsasanay', reviewed: false },
      notReady: {
        title: { standard: 'Hindi pa handa ang pagsasanay', reviewed: false },
        body: {
          standard: 'Inihahanda pa namin ang mga tanong sa pagsasanay para sa araling ito.',
          reviewed: false,
        },
      },
      none: { standard: 'Walang tanong sa pagsasanay ang araling ito.', reviewed: false },
    },
    done: {
      title: { standard: 'Natapos mo: {title}', reviewed: false },
      listen: { standard: 'Pakinggan ang pahinang ito', reviewed: false },
      icon: { standard: 'Tapos na', reviewed: false },
      next: {
        standard:
          'Susunod, magbasa ng bagong kuwento. May {count, plural, one {# tanong} other {# na tanong}} ito tungkol sa paraang ito para makita kung natatandaan mo.',
        reviewed: false,
      },
      badge: {
        standard:
          'Darating ang badge na "Natutunan na" kapag tama ang sagot mo sa {count, plural, one {# tanong} other {# na tanong}} sa totoong kuwento. Hindi nagbabago ang antas mo dahil sa pagsasanay dito.',
        reviewed: false,
      },
    },
  },
  skip: {
    toContent: {
      standard: 'Lumaktaw sa pangunahing nilalaman',
      simple: 'Lumaktaw sa pahina',
      reviewed: false,
    },
  },
  nav: {
    main: { standard: 'Pangunahin', simple: 'Menu', reviewed: false },
    home: { standard: 'Home', lowLevel: true, reviewed: false },
    learn: { standard: 'Matuto', lowLevel: true, reviewed: false },
    progress: {
      standard: 'Aking progreso',
      simple: 'Aking hakbang',
      lowLevel: true,
      reviewed: false,
    },
    account: { standard: 'Aking account', simple: 'Ako', lowLevel: true, reviewed: false },
    signOut: { standard: 'Mag-sign out', simple: 'Mag-log out', lowLevel: true, reviewed: false },
    parentAccount: { standard: 'Account ng magulang', reviewed: false },
  },
  header: {
    newHere: {
      standard: 'Bago ka ba? Gumawa ng account',
      simple: 'Bago? Gumawa ng account',
      reviewed: false,
    },
    haveAccount: {
      standard: 'May account ka na ba? Mag-sign in',
      simple: 'May account? Mag-sign in',
      reviewed: false,
    },
  },
  placeholder: {
    body: {
      standard:
        'Hindi pa tapos ang screen na ito. Magpapakita ito ng totoong gawain kapag handa na.',
      simple: 'Hindi pa handa ang pahinang ito.',
      reviewed: false,
    },
    board: { standard: 'Design canvas {boards}', reviewed: false },
  },
  errors: {
    generic: {
      title: { standard: 'May nangyaring mali', simple: 'Naku. May nasira.', reviewed: false },
      body: {
        standard: 'Hindi namin maipakita ang pahinang ito. Pakisubukang muli.',
        simple: 'Hindi namin maipakita ito. Subukan ulit.',
        reviewed: false,
      },
    },
    notWired: {
      title: {
        standard: 'Hindi pa handa ang bahaging ito',
        simple: 'Hindi pa handa',
        reviewed: false,
      },
      body: {
        standard: 'Ginagawa pa namin ito. Pakibalik muli mamaya.',
        simple: 'Ginagawa pa namin ito. Bumalik ka mamaya.',
        reviewed: false,
      },
    },
    retry: { standard: 'Subukang muli', lowLevel: true, reviewed: false },
    notFound: {
      title: {
        standard: 'Hindi namin mahanap ang pahinang iyon',
        simple: 'Hindi namin mahanap iyon',
        reviewed: false,
      },
      body: {
        standard: 'Maaaring luma na ang link, o inilipat ang pahina.',
        simple: 'Maaaring luma na ang link.',
        reviewed: false,
      },
      action: { standard: 'Pumunta sa sign in', reviewed: false },
    },
  },
  browser: {
    unsupported: {
      title: {
        standard: 'Maaaring hindi gumana nang maayos ang browser na ito',
        simple: 'Maaaring hindi gumana ang browser na ito',
        reviewed: false,
      },
      body: {
        standard:
          'Kailangan ng mas bagong browser sa pagbasa nang malakas. Maaari ka pa ring mag-sign in. Para sa pinakamagandang resulta, gamitin ang pinakabagong Chrome, Edge, Samsung Internet o Firefox, o Safari 16.4 pataas.',
        simple:
          'Gumamit ng mas bagong browser para magbasa nang malakas. Maaari ka pa ring mag-sign in.',
        reviewed: false,
      },
    },
  },
  loading: {
    page: { standard: 'Naglo-load', lowLevel: true, reviewed: false },
  },
  idle: {
    title: { standard: 'Nandiyan ka pa ba?', simple: 'Nandiyan ka pa ba?', reviewed: false },
    body: {
      standard: 'Malapit ka nang i-sign out para manatiling ligtas ang iyong account.',
      simple: 'Malapit ka nang i-log out.',
      reviewed: false,
    },
    stay: {
      standard: 'Manatiling naka-sign in',
      simple: 'Manatiling naka-log in',
      lowLevel: true,
      reviewed: false,
    },
  },
  screens: {
    signIn: { standard: 'Mag-sign in', reviewed: false },
    signUp: { standard: 'Gumawa ng account', simple: 'Mag-sign up', reviewed: false },
    home: { standard: 'Home ng mag-aaral at antas', simple: 'Home at antas', reviewed: false },
    read: { standard: 'Sesyon ng pagbasa', simple: 'Magbasa nang malakas', reviewed: false },
    analysis: {
      standard: 'AI na pagsusuri ng pagbasa',
      simple: 'Paano ka nagbasa',
      reviewed: false,
    },
    questions: { standard: 'Mga tanong', reviewed: false },
    result: { standard: 'Resulta at progreso ng antas', simple: 'Resulta mo', reviewed: false },
    levelUp: { standard: 'Pag-angat ng antas', reviewed: false },
    progress: { standard: 'Aking progreso', simple: 'Aking hakbang', reviewed: false },
    account: { standard: 'Aking account', simple: 'Ako', reviewed: false },
    share: { standard: 'Ibahagi sa magulang', reviewed: false },
    help: { standard: 'Tulong sa pagbasa', reviewed: false },
    placement: {
      standard: 'Hanapin ang aking panimulang antas',
      simple: 'Hanapin ang antas ko',
      reviewed: false,
    },
    placementNext: {
      standard: 'Sa pagitan ng mga kuwento sa placement',
      simple: 'Susunod na kuwento',
      reviewed: false,
    },
    placementResult: {
      standard: 'Ang iyong panimulang antas',
      simple: 'Ang antas mo',
      reviewed: false,
    },
    learn: { standard: 'Home ng Matuto', simple: 'Matuto', reviewed: false },
    lesson: { standard: 'Aralin', reviewed: false },
    practice: { standard: 'Pagsasanay sa aralin', simple: 'Magsanay', reviewed: false },
    lessonDone: { standard: 'Tapos na ang aralin', simple: 'Tapos na', reviewed: false },
    words: {
      standard: 'Pagsasanay sa salita: Sabihin ito',
      simple: 'Sabihin ang salita',
      reviewed: false,
    },
    parentLink: {
      standard: 'I-link ang account ng iyong anak',
      simple: 'I-link ang anak mo',
      reviewed: false,
    },
    parentProgress: { standard: 'Progreso para sa magulang', reviewed: false },
    parentReadings: { standard: 'Mga pagbasa at AI na pagsusuri', reviewed: false },
    parentLevels: { standard: 'Mga antas at pagsubok', reviewed: false },
    parentDecisions: { standard: 'Mga desisyon ng AI', reviewed: false },
    parentPrivacy: { standard: 'Mga naka-link na anak at privacy', reviewed: false },
  },
  language: {
    label: { standard: 'Wika', simple: 'Wika', reviewed: false },
    en: { standard: 'English', reviewed: false },
    fil: { standard: 'Filipino', reviewed: false },
  },
} as const satisfies SameShape<typeof en>;
