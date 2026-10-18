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
      standard: 'Ang mga kuwento sa Antas {level} ay {min} hanggang {max} salita.',
      reviewed: false,
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
  account: {
    signIn: {
      title: { standard: 'Mag-sign in', reviewed: false },
      heroTitle: {
        standard: 'Magbasa nang malakas. Umunawa nang mas mabuti.',
        simple: 'Magbasa nang malakas. Umunawa pa.',
        reviewed: false,
      },
      heroBody: {
        standard:
          'Magbasa ng maikling kuwento sa iyong antas. Makikinig ang AI teacher mo, tutulong sa mahihirap na salita, at magtatanong kung ano ang naintindihan mo.',
        simple: 'Magbasa ng maikling kuwento. Makikinig at tutulong ang AI teacher mo.',
        reviewed: false,
      },
      point1: {
        standard: 'Magbasa nang malakas at makakuha ng tulong agad',
        simple: 'Magbasa nang malakas at magpatulong',
        reviewed: false,
      },
      point2: {
        standard: 'Mga kuwentong humihirap habang gumagaling ka',
        simple: 'Humihirap ang kuwento habang gumagaling ka',
        reviewed: false,
      },
      point3: {
        standard: 'Makita ang sarili mong progreso, hindi mo kailangan ng iba',
        simple: 'Makita ang sarili mong progreso',
        reviewed: false,
      },
      identifier: { standard: 'Username o email', reviewed: false },
      password: { standard: 'Password', reviewed: false },
      submit: { standard: 'Mag-sign in', reviewed: false },
      forgot: { standard: 'Nakalimutan ang password?', reviewed: false },
      create: { standard: 'Gumawa ng account', reviewed: false },
      parentNote: {
        standard:
          'Magulang o tagapag-alaga? Mag-sign in dito gamit ang sarili mong account para makita ang progreso ng anak.',
        simple: 'Magulang? Mag-sign in dito gamit ang sarili mong account.',
        reviewed: false,
      },
    },
    signUp: {
      title: { standard: 'Gumawa ng iyong account', reviewed: false },
      intro: {
        standard: 'Kahit sino ay puwedeng matuto rito. Hindi mo kailangan ng magulang o paaralan.',
        simple: 'Kahit sino ay puwedeng matuto rito.',
        reviewed: false,
      },
      username: { standard: 'Username', reviewed: false },
      usernameHint: {
        standard: 'Hindi ang buo mong pangalan. Mga letra at numero lang.',
        simple: 'Hindi ang totoong pangalan. Letra at numero.',
        reviewed: false,
      },
      password: { standard: 'Password', reviewed: false },
      passwordHint: { standard: 'Hindi bababa sa {min} na karakter.', reviewed: false },
      email: { standard: 'Email (opsyonal)', reviewed: false },
      emailHint: {
        standard: 'Sa email, puwede mong i-reset ang password. Kung wala, hindi puwede.',
        simple: 'Sa email, puwede mong i-reset ang password.',
        reviewed: false,
      },
      submit: { standard: 'Gumawa ng account', reviewed: false },
      parentTitle: { standard: 'Gumawa ng account ng magulang', reviewed: false },
      parentIntro: {
        standard:
          'May sariling account ang anak mo. Gumawa ka ng sa iyo para makita ang progresong pinili niyang ibahagi.',
        simple: 'Gumawa ng sarili mong account para makita ang ibinabahagi ng anak mo.',
        reviewed: false,
      },
      parentEmail: { standard: 'Iyong email', reviewed: false },
      parentSwitch: {
        standard: 'Magulang o tagapag-alaga? Gumawa ng account ng magulang',
        simple: 'Magulang? Gumawa ng account ng magulang',
        reviewed: false,
      },
      studentSwitch: {
        standard: 'Mag-aaral? Gumawa ng account ng mag-aaral',
        simple: 'Mag-aaral? Gumawa ng account',
        reviewed: false,
      },
    },
    reset: {
      title: { standard: 'I-reset ang iyong password', reviewed: false },
      intro: {
        standard: 'I-type ang email ng iyong account. Magpapadala kami ng link.',
        simple: 'I-type ang email mo. Magpapadala kami ng link.',
        reviewed: false,
      },
      email: { standard: 'Email', reviewed: false },
      submit: { standard: 'Ipadala ang link', reviewed: false },
      sent: {
        standard:
          'Kung may account ang email na iyon, nagpadala kami ng link. Tingnan ang inbox mo.',
        simple: 'Kung kilala namin ang email, nagpadala kami ng link.',
        reviewed: false,
      },
      noEmail: {
        standard:
          'Walang email ang account mo? Hindi namin ito ma-reset. Humingi ng tulong sa magulang o guro para gumawa ng bagong account.',
        simple: 'Walang email ang account mo? Hindi namin ito ma-reset.',
        reviewed: false,
      },
      back: { standard: 'Bumalik sa sign in', reviewed: false },
      newTitle: { standard: 'Pumili ng bagong password', reviewed: false },
      newPassword: { standard: 'Bagong password', reviewed: false },
      newSubmit: { standard: 'I-save ang password', reviewed: false },
      done: {
        standard: 'Napalitan na ang password mo. Mag-sign in gamit ito.',
        simple: 'Napalitan na ang password. Mag-sign in.',
        reviewed: false,
      },
      badLink: {
        standard: 'Hindi valid o nag-expire na ang link na ito. Humingi ng bago.',
        simple: 'Hindi gumagana ang link. Humingi ng bago.',
        reviewed: false,
      },
    },
    myAccount: {
      title: { standard: 'Aking account', simple: 'Ako', reviewed: false },
      username: { standard: 'Username', reviewed: false },
      usernameFixed: { standard: 'Hindi mapapalitan', reviewed: false },
      email: {
        standard: 'Email, para sa pag-reset ng password',
        simple: 'Email, para sa password',
        reviewed: false,
      },
      noEmail: {
        standard: 'Walang email. Kung makalimutan mo ang password, hindi namin ito ma-reset.',
        simple: 'Walang email. Hindi namin ma-reset ang password.',
        reviewed: false,
      },
      passwordTitle: { standard: 'Palitan ang password', reviewed: false },
      currentPassword: { standard: 'Kasalukuyang password', reviewed: false },
      newPassword: { standard: 'Bagong password', reviewed: false },
      passwordSubmit: { standard: 'Palitan ang password', reviewed: false },
      passwordChanged: { standard: 'Napalitan na ang password mo.', reviewed: false },
      voiceTitle: { standard: 'Aking boses', reviewed: false },
      voiceBody: {
        standard:
          'Kapag nagbabasa ka nang malakas, ginagawang teksto ang boses mo para masundan ito. Itinatapon ang audio pagkatapos.',
        simple: 'Ginagawang teksto ang boses mo. Itinatapon ang audio.',
        reviewed: false,
      },
      notReady: {
        standard: 'Hindi pa handa ang mga setting para sa recording, pag-download at pagbura.',
        simple: 'Hindi pa handa ang mga setting na ito.',
        reviewed: false,
      },
      shareTitle: { standard: 'Magulang o tagapag-alaga', simple: 'Magulang', reviewed: false },
      shareBody: {
        standard: 'Opsyonal. Ikaw ang pipili kung may iba pang makakakita ng progreso mo.',
        simple: 'Ikaw ang pipili kung sino ang makakakita.',
        reviewed: false,
      },
      shareLink: { standard: 'Ibahagi ang progreso ko', reviewed: false },
      helpLink: { standard: 'Tulong sa pagbasa', reviewed: false },
    },
    share: {
      title: {
        standard: 'Ibahagi ang progreso mo sa magulang',
        simple: 'Ibahagi sa magulang',
        reviewed: false,
      },
      intro: {
        standard:
          'Ikaw ang bahala. Magagamit mo ang BasaBridge nang walang iba. Kung gusto mong sumuporta ang magulang o tagapag-alaga, bigyan sila ng code.',
        simple: 'Ikaw ang bahala. Puwede kang matuto nang hindi nagbabahagi.',
        reviewed: false,
      },
      codeTitle: { standard: 'Iyong link code', reviewed: false },
      codeEmpty: { standard: 'Wala ka pang code.', reviewed: false },
      codeHelp: {
        standard:
          'Mag-sign in ang magulang mo gamit ang sarili niyang account at i-type ang code. Isang beses lang ito gumagana at hihinto pagkalipas ng 24 oras.',
        simple: 'I-type ng magulang mo ang code. Isang beses lang ito.',
        reviewed: false,
      },
      makeCode: { standard: 'Gumawa ng code', reviewed: false },
      seeTitle: { standard: 'Ano ang makikita ng magulang', reviewed: false },
      seeProgress: { standard: 'Aking antas at mga kasanayan', reviewed: false },
      seeProgressBody: {
        standard: 'Antas, nagamit na pagsubok, pag-unawa at marka sa pagbasa.',
        reviewed: false,
      },
      seeAnalysis: { standard: 'Pagsusuri sa pagbasa', reviewed: false },
      seeAnalysisBody: {
        standard: 'Mga salitang nahihirapan ako at mga tala ng AI teacher.',
        reviewed: false,
      },
      voiceNever: { standard: 'Aking mga recording ng boses', reviewed: false },
      voiceNeverBody: {
        standard: 'Hindi ito kailanman makikita o maririnig ng magulang.',
        reviewed: false,
      },
      linkedTitle: { standard: 'Mga naka-link na magulang', reviewed: false },
      linkedEmpty: {
        standard:
          'Wala pang naka-link na magulang. Lalabas dito ang mga switch kapag may nag-link.',
        simple: 'Wala pang naka-link na magulang.',
        reviewed: false,
      },
      linkedOn: { standard: 'Naka-link', reviewed: false },
      stop: { standard: 'Ihinto ang pagbabahagi', reviewed: false },
      save: { standard: 'I-save ang mga pinili', simple: 'I-save', reviewed: false },
    },
    parentLink: {
      title: {
        standard: 'I-link ang account ng anak mo',
        simple: 'I-link ang anak mo',
        reviewed: false,
      },
      intro: {
        standard:
          'May sariling BasaBridge account ang anak mo at siya ang pipiling magbahagi ng progreso sa iyo. Hingin sa kanya ang link code mula sa Aking account, at i-type ito rito.',
        simple: 'Hingin ang link code ng anak mo. I-type ito rito.',
        reviewed: false,
      },
      code: { standard: 'Link code', reviewed: false },
      codeHint: { standard: 'Ganito ang itsura: BB-4F7K-92.', reviewed: false },
      confirm: {
        standard: 'Ako ang magulang o legal na tagapag-alaga ng batang ito.',
        reviewed: false,
      },
      submit: { standard: 'I-link ang anak', reviewed: false },
      seeTitle: { standard: 'Ano ang makikita mo', reviewed: false },
      see1: { standard: 'Antas, pagsubok at marka sa kasanayan', reviewed: false },
      see2: { standard: 'Mga salitang nahihirapan ang anak mo', reviewed: false },
      see3: { standard: 'Mga tala at desisyon ng AI teacher', reviewed: false },
      noVoice: {
        standard:
          'Hindi mo kailanman makikita o maririnig ang mga recording ng boses ng anak mo. Puwedeng ihinto ng anak mo ang pagbabahagi anumang oras.',
        reviewed: false,
      },
    },
    state: {
      pending: { standard: 'Sandali lang', reviewed: false },
      notWired: {
        standard: 'Hindi pa handa ang bahaging ito. Ginagawa pa namin ito.',
        simple: 'Hindi pa handa. Bumalik ka mamaya.',
        reviewed: false,
      },
    },
    errors: {
      required: { standard: 'Pakipunan ito.', reviewed: false },
      usernameLength: {
        standard: 'Gumamit ng {min} hanggang {max} na karakter.',
        reviewed: false,
      },
      usernameChars: { standard: 'Mga letra at numero lang.', reviewed: false },
      usernameNotAllowed: {
        standard:
          'Pumili ng ibang username. Huwag gamitin ang pangalan, paaralan o numero ng telepono mo.',
        simple: 'Pumili ng ibang username.',
        reviewed: false,
      },
      usernameTaken: {
        standard: 'May gumagamit na ng username na iyon. Subukan ang iba.',
        reviewed: false,
      },
      passwordShort: {
        standard: 'Gumamit ng hindi bababa sa {min} na karakter.',
        reviewed: false,
      },
      passwordLong: { standard: 'Masyadong mahaba ang password.', reviewed: false },
      passwordWrong: { standard: 'Hindi iyan ang kasalukuyan mong password.', reviewed: false },
      emailInvalid: { standard: 'Mukhang hindi iyan email.', reviewed: false },
      invalidLogin: {
        standard: 'Mali ang username, email o password. Subukan ulit.',
        simple: 'Mali iyon. Subukan ulit.',
        reviewed: false,
      },
      locked: {
        standard: 'Napakaraming pagsubok. Maghintay ng {minutes} minuto, saka subukan ulit.',
        simple: 'Napakaraming pagsubok. Maghintay ng {minutes} minuto.',
        reviewed: false,
      },
      signUpFailed: {
        standard:
          'Hindi namin magawa ang account na iyon. Suriin ang detalye, o mag-sign in kung mayroon ka na.',
        simple: 'Hindi magawa ang account. Subukan ulit.',
        reviewed: false,
      },
      notWired: {
        standard: 'Hindi pa handa ang bahaging ito. Ginagawa pa namin ito.',
        simple: 'Hindi pa handa. Bumalik ka mamaya.',
        reviewed: false,
      },
      generic: {
        standard: 'May nangyaring mali. Pakisubukan ulit.',
        simple: 'May mali. Subukan ulit.',
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
