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
  readingHelp: {
    title: { standard: 'Tulong sa pagbasa', reviewed: false },
    presets: { standard: 'Pumili ng set ng tulong', reviewed: false },
    presetStandard: { standard: 'Karaniwan', reviewed: false },
    presetMore: { standard: 'Mas maraming tulong', reviewed: false },
    audio: {
      label: {
        standard: 'Basahin ang mga tagubilin',
        simple: 'Sabihin ang mga hakbang',
        reviewed: false,
      },
      desc: {
        standard: 'May speaker button sa bawat tagubilin, at kusang magsasalita ang unang screen.',
        simple: 'May speaker button sa bawat hakbang.',
        reviewed: false,
      },
    },
    questions: {
      label: {
        standard: 'Basahin sa akin ang mga tanong',
        simple: 'Basahin ang mga tanong',
        reviewed: false,
      },
      desc: {
        standard: 'Pakinggan ang bawat tanong at mga sagot. Hindi nito binabago ang iyong score.',
        simple: 'Pakinggan ang tanong. Pareho pa rin ang score.',
        reviewed: false,
      },
    },
    language: {
      label: { standard: 'Wika ng mga tagubilin', simple: 'Wika', reviewed: false },
      desc: {
        standard: 'Nananatiling Ingles ang mga kuwento.',
        simple: 'Ingles pa rin ang mga kuwento.',
        reviewed: false,
      },
    },
    simple: {
      label: { standard: 'Maikli at simpleng salita', simple: 'Madaling salita', reviewed: false },
      desc: {
        standard: 'Mas kaunti at mas madaling salita ang mga tagubilin.',
        simple: 'Mas kaunti at mas madaling salita.',
        reviewed: false,
      },
    },
    textSize: {
      legend: { standard: 'Laki ng teksto', simple: 'Laki ng teksto', reviewed: false },
      small: { standard: 'Maliit na teksto', simple: 'Maliit na teksto', reviewed: false },
      medium: { standard: 'Katamtamang teksto', simple: 'Katamtamang teksto', reviewed: false },
      large: { standard: 'Malaking teksto', simple: 'Malaking teksto', reviewed: false },
    },
    lineSpacing: {
      legend: { standard: 'Layo ng mga linya', simple: 'Layo ng mga linya', reviewed: false },
      normal: { standard: 'Karaniwan', simple: 'Karaniwan', reviewed: false },
      wide: { standard: 'Malawak', simple: 'Malawak', reviewed: false },
    },
    ruler: {
      label: {
        standard: 'Panuntunan sa pagbasa',
        simple: 'Panuntunan sa pagbasa',
        reviewed: false,
      },
      desc: {
        standard: 'Iha-highlight ang linyang binabasa mo at padidilimin ang iba.',
        simple: 'Ipinapakita ang linyang binabasa mo.',
        reviewed: false,
      },
      previous: { standard: 'Naunang linya', simple: 'Pataas na linya', reviewed: false },
      next: { standard: 'Susunod na linya', simple: 'Pababang linya', reviewed: false },
      story: { standard: 'Teksto ng kuwento', simple: 'Kuwento', reviewed: false },
    },
    contrast: {
      label: { standard: 'Mataas na contrast', simple: 'Matitingkad na kulay', reviewed: false },
      desc: {
        standard:
          'Itim at puti na may mas madilim na linya. Nananatili ang setting na ito sa device na ito.',
        simple: 'Mas madilim na kulay. Sa device na ito lang.',
        reviewed: false,
      },
    },
    own: {
      standard: 'Sa iyo ang mga setting na ito. Hindi ito mababago ng nakatatanda para sa iyo.',
      reviewed: false,
    },
    preview: {
      title: { standard: 'Preview', simple: 'Preview', reviewed: false },
      line1: { standard: 'Lia and her grandfather have a mango tree.', reviewed: false },
      line2: { standard: 'Every morning, Lia checks the tree.', reviewed: false },
      line3: { standard: 'The mangoes are still green.', reviewed: false },
    },
    status: {
      device: {
        standard:
          'Naka-save sa device na ito. Hindi pa kayang itago ng account mo ang mga setting, kaya maghihintay ang wika at simpleng salita.',
        simple: 'Naka-save sa device na ito lang.',
        reviewed: false,
      },
      blocked: {
        standard:
          'Hindi na-save ng browser na ito ang mga setting mo. Mawawala ito kapag umalis ka.',
        simple: 'Hindi namin na-save ang mga setting mo.',
        reviewed: false,
      },
    },
  },
  language: {
    label: { standard: 'Wika', simple: 'Wika', reviewed: false },
    en: { standard: 'English', reviewed: false },
    fil: { standard: 'Filipino', reviewed: false },
  },
} as const satisfies SameShape<typeof en>;
