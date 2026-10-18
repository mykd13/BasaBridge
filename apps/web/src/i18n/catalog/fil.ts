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
  legal: {
    links: {
      privacy: { standard: 'Abiso sa privacy', simple: 'Privacy', reviewed: false },
      terms: { standard: 'Mga tuntunin sa paggamit', simple: 'Mga patakaran', reviewed: false },
      kids: {
        standard: 'Privacy para sa mga bata',
        simple: 'Privacy para sa mga bata',
        reviewed: false,
      },
    },
    nav: { standard: 'Legal', simple: 'Privacy at mga patakaran', reviewed: false },
    version: { standard: 'Bersyon {version}', reviewed: false },
    contact: {
      standard: 'May tanong tungkol sa privacy? Sumulat sa <mail>{email}</mail>.',
      reviewed: false,
    },
    contactMissing: {
      standard: 'Hindi pa naitatakda ang email address para sa privacy.',
      reviewed: false,
    },
    providers: {
      name: { standard: 'Serbisyo', reviewed: false },
      purpose: { standard: 'Ano ang ginagawa nito', reviewed: false },
      sees: { standard: 'Ano ang nakikita nito', reviewed: false },
      neverSees: { standard: 'Ano ang hindi nito nakikita', reviewed: false },
      undecided: { standard: 'Hindi pa napipili', reviewed: false },
      caption: {
        standard: 'Mga serbisyong humahawak ng datos para sa BasaBridge',
        reviewed: false,
      },
    },
    speak: {
      listen: { standard: 'Pakinggan ang talatang ito', simple: 'Pakinggan', reviewed: false },
      stop: { standard: 'Itigil ang pakikinig', simple: 'Itigil', reviewed: false },
    },
    update: {
      title: { standard: 'Binago namin ang abiso sa privacy o ang mga tuntunin', reviewed: false },
      body: {
        standard:
          'Pakibasa ang mga nagbago. Magagamit mo muli ang BasaBridge pagkatapos mong pumayag.',
        reviewed: false,
      },
      later: {
        standard:
          'Hindi pa handa ang pagpayag sa bagong bersyon. Darating ito kasama ng mga tala ng pahintulot.',
        reviewed: false,
      },
    },
    kids: {
      draft: {
        standard:
          'Draft pa lang ito. Naghihintay ng kwalipikadong pagsusuri. Susuriin ito ng nakatatandang marunong sa batas.',
        spoken: true,
        reviewed: false,
      },
      what1: {
        standard: 'Tinutulungan ka ng BasaBridge na magbasa ng mga kuwento.',
        spoken: true,
        reviewed: false,
      },
      what2: {
        standard: 'Nagbabasa ka nang malakas, at sinusuri ng computer ang mga salita.',
        spoken: true,
        reviewed: false,
      },
      keep1: { standard: 'Itinatago namin ang iyong username.', spoken: true, reviewed: false },
      keep2: {
        standard: 'Itinatago namin kung paano ka nagbasa at kung paano ka sumagot.',
        spoken: true,
        reviewed: false,
      },
      voice1: {
        standard: 'Ginagamit namin ang boses mo para suriin ang pagbasa mo.',
        spoken: true,
        reviewed: false,
      },
      voice2: {
        standard: 'Pagkatapos, itinatapon namin ito, maliban kung pipiliin mong itago.',
        spoken: true,
        reviewed: false,
      },
      voice3: {
        standard:
          'Kung itatago, buburahin namin ito pagkalipas ng 30 araw. Hindi ito naririnig ng mga magulang.',
        spoken: true,
        reviewed: false,
      },
      helpers1: {
        standard: 'May ilang computer na katulong na gumagana kasama ng BasaBridge.',
        spoken: true,
        reviewed: false,
      },
      helpers2: {
        standard: 'Hindi namin ipinapadala sa katulong ang pangalan o username mo.',
        spoken: true,
        reviewed: false,
      },
      helpers3: {
        standard: 'Ang boses mo ay napupunta lamang sa katulong na nakikinig sa pagbasa mo.',
        spoken: true,
        reviewed: false,
      },
      grownup1: {
        standard:
          'Kung wala ka pang 13 taong gulang, kailangang pumayag muna ang nakatatanda bago mo gamitin ang mikropono.',
        spoken: true,
        reviewed: false,
      },
      grownup2: {
        standard: 'Makakabasa ka pa rin nang tahimik at makakasagot sa mga tanong.',
        spoken: true,
        reviewed: false,
      },
      share1: {
        standard: 'Ikaw ang pipili kung ano ang makikita ng magulang.',
        spoken: true,
        reviewed: false,
      },
      share2: {
        standard: 'Maaari kang tumigil sa pagbabahagi anumang oras.',
        spoken: true,
        reviewed: false,
      },
      ask1: {
        standard: 'May tanong? Magpasulat sa nakatatanda sa address na nasa pahinang ito.',
        spoken: true,
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
