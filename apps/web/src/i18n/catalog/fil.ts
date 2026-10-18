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
  parent: {
    nav: {
      label: { standard: 'Mga seksyon para sa anak na ito', reviewed: false },
      progress: { standard: 'Progreso', reviewed: false },
      readings: { standard: 'Mga pagbasa', reviewed: false },
      levels: { standard: 'Mga antas at subok', reviewed: false },
      decisions: { standard: 'Mga desisyon ng AI', reviewed: false },
      privacy: { standard: 'Data at privacy', reviewed: false },
    },
    titles: {
      progress: { standard: 'Progreso', reviewed: false },
      readings: { standard: 'Mga pagbasa at AI na pagsusuri', reviewed: false },
      levels: { standard: 'Mga antas at subok', reviewed: false },
      decisions: { standard: 'Mga desisyon ng AI', reviewed: false },
      privacy: { standard: 'Mga naka-link na anak at privacy', reviewed: false },
    },
    sections: {
      progress: { standard: 'Progreso', reviewed: false },
      readings: { standard: 'Mga pagbasa', reviewed: false },
      levels: { standard: 'Kasaysayan ng antas', reviewed: false },
      decisions: { standard: 'Mga desisyon ng AI', reviewed: false },
    },
    summary: {
      grade: { standard: 'Baitang {grade}', reviewed: false },
      level: { standard: 'Antas {level} sa {max}', reviewed: false },
      readings: {
        standard: '{count, plural, one {# pagbasa} other {# na pagbasa}}',
        reviewed: false,
      },
      sharedSince: {
        standard: 'Ibinabahagi mula {date}. Ang anak mo ang may hawak ng kung ano ang makikita mo.',
        reviewed: false,
      },
    },
    states: {
      emptyTitle: { standard: 'Wala pang maipapakita', reviewed: false },
      empty: {
        progress: {
          standard:
            'Lalabas dito ang progreso kapag nagbasa nang malakas ang anak mo ng kuwento at sumagot.',
          reviewed: false,
        },
        readings: {
          standard: 'Lalabas dito ang bawat pagbasa kapag natapos ng anak mo ang isang kuwento.',
          reviewed: false,
        },
        levels: {
          standard: 'Lalabas dito ang mga pagbabago ng antas habang nagbabasa ang anak mo.',
          reviewed: false,
        },
        decisions: {
          standard: 'Lalabas dito ang mga desisyon kapag nagbasa ng kuwento ang anak mo.',
          reviewed: false,
        },
        privacy: { standard: 'Wala pang naka-link na anak sa account mo.', reviewed: false },
      },
      notSharedTitle: { standard: 'Hindi ibinabahagi sa iyo ang {section}', reviewed: false },
      notSharedBody: {
        standard:
          'Hindi ito ibinahagi sa iyo ng anak mo. Makikita mo lang ang pinili niyang ibahagi.',
        reviewed: false,
      },
      notSharedStep: {
        standard:
          'Para makita ito, hilingin sa anak mo na buksan ang Ibahagi sa magulang sa kanyang account at i-on ang seksyong ito.',
        reviewed: false,
      },
      errorTitle: { standard: 'Hindi namin ma-load ang pahinang ito', reviewed: false },
      errorBody: {
        standard: 'May nangyaring mali sa aming panig. Pakisubukan ulit.',
        reviewed: false,
      },
      retry: { standard: 'Subukan ulit', reviewed: false },
    },
    skills: {
      decoding: {
        name: { standard: 'Pag-decode', reviewed: false },
        about: { standard: 'Wastong pagbigkas ng mga salita', reviewed: false },
      },
      fluency: {
        name: { standard: 'Katatasan', reviewed: false },
        about: { standard: 'Maayos at tuloy-tuloy na pagbasa', reviewed: false },
      },
      vocabulary: {
        name: { standard: 'Bokabularyo', reviewed: false },
        about: { standard: 'Pag-alam sa kahulugan ng mga salita sa konteksto', reviewed: false },
      },
      literal: {
        name: { standard: 'Literal na pag-unawa', reviewed: false },
        about: { standard: 'Paghanap ng direktang sinasabi ng teksto', reviewed: false },
      },
      inferential: {
        name: { standard: 'Pag-unawa sa implikasyon', reviewed: false },
        about: { standard: 'Pag-unawa sa ipinahihiwatig ng teksto', reviewed: false },
      },
    },
    confidence: {
      none: { standard: 'Wala pang ebidensya', reviewed: false },
      early: { standard: 'Mga unang senyales', reviewed: false },
      building: { standard: 'Nabubuo pa ang larawan', reviewed: false },
      steady: { standard: 'Matatag na ebidensya', reviewed: false },
    },
    progress: {
      level: {
        eyebrow: { standard: 'Antas', reviewed: false },
        of: { standard: 'sa {max}', reviewed: false },
        progressLabel: { standard: 'Mga kuwentong naipasa sa antas na ito', reviewed: false },
        progressText: {
          standard: '{passes} sa {needed} kuwento ang naipasa para sa Antas {next}',
          reviewed: false,
        },
        top: { standard: 'Ito na ang pinakamataas na antas.', reviewed: false },
      },
      tries: {
        title: { standard: 'Subok bawat kuwento', reviewed: false },
        unlimited: { standard: 'Walang limitasyon', reviewed: false },
        next: { standard: 'Magiging {tries} sa Antas {level}.', reviewed: false },
      },
      averageTries: {
        title: { standard: 'Karaniwang nagamit na subok', reviewed: false },
        note: {
          standard: 'Sa nakaraang {count, plural, one {# kuwento} other {# na kuwento}}',
          reviewed: false,
        },
        none: { standard: 'Wala pang kuwento', reviewed: false },
      },
      skills: {
        title: { standard: 'Mga kasanayan sa pagbasa', reviewed: false },
        intro: {
          standard:
            'Galing lang ang mga pagtataya sa binasa at sinagot ng anak mo, mas pinagbibigyang-halaga ang mga huling pagbasa.',
          reviewed: false,
        },
        wordsRight: { standard: '{right} sa {total} salita ang tama', reviewed: false },
        correct: { standard: '{right} sa {total} ang tama', reviewed: false },
        pace: { standard: 'tamang salita kada minuto', reviewed: false },
        up: { standard: 'Tumaas ng {delta} mula sa huling pagbasa', reviewed: false },
        down: { standard: 'Bumaba ng {delta} mula sa huling pagbasa', reviewed: false },
      },
      patterns: {
        title: { standard: 'Mga padron sa pagbasa na nakita ng AI Teacher', reviewed: false },
        intro: {
          standard: 'Mula sa paghahambing ng boses ng anak mo sa teksto, salita por salita.',
          reviewed: false,
        },
        none: {
          standard: 'Wala pang nakitang padron. Lalabas ito kapag umulit ang parehong bagay.',
          reviewed: false,
        },
        counts: {
          standard:
            'Nakita nang {count, plural, one {# beses} other {# na beses}} sa {tries, plural, one {# pagbasa} other {# na pagbasa}}.',
          reviewed: false,
        },
        dropped_ending: {
          standard: 'Madalas na hindi nababasa ang dulo ng salita tulad ng “-{key}”.',
          reviewed: false,
        },
        letter_pattern: {
          standard: 'Bumabagal sa mga salitang may “{key}”.',
          reviewed: false,
        },
        repeated_substitution: {
          standard: 'Madalas basahin ang “{from}” bilang “{to}”.',
          reviewed: false,
        },
        missing_pause: {
          standard: 'Tuloy-tuloy ang basa sa mga tuldok nang hindi humihinto.',
          reviewed: false,
        },
        confidence: {
          low: { standard: 'Mababang kumpiyansa', reviewed: false },
          medium: { standard: 'Katamtamang kumpiyansa', reviewed: false },
          high: { standard: 'Mataas na kumpiyansa', reviewed: false },
        },
        mishear: {
          standard:
            'Maaaring mali ang dinig ng speech recognition sa ilang boses at punto. Tingnan ang listahan ng salita sa Mga pagbasa.',
          reviewed: false,
        },
      },
      plan: {
        title: { standard: 'Kasalukuyang plano', reviewed: false },
        last: {
          standard:
            'Sa pagbasang ito: {correct} sa {total} tanong ang tama at {percent}% ng mga salita ang tama.',
          reviewed: false,
        },
        lastNoVoice: {
          standard:
            'Sa pagbasang ito: {correct} sa {total} tanong ang tama. Walang resulta sa boses.',
          reviewed: false,
        },
        next: { standard: 'Bagong teksto ang susunod na kuwento.', reviewed: false },
        focus: {
          standard:
            'Pokus: {skill}. Ito ang pinakamababang nasukat na kasanayan sa pag-unawa sa ngayon ({right} sa {total} ang tama).',
          reviewed: false,
        },
        focusNone: {
          standard: 'Wala pang pokus. Pipiliin ito kapag sapat na ang mga sagot.',
          reviewed: false,
        },
        rule: {
          standard:
            'Pinipili ang pokus ayon sa tuntunin, mula sa pinakamababang pagtataya. Hindi ito pinipili ng AI Teacher.',
          reviewed: false,
        },
      },
      notes: {
        title: { standard: 'Gawain sa bahay', reviewed: false },
        notReady: {
          standard: 'Hindi pa handa ang mga tala ng AI Teacher. Ito ang karaniwang gawain.',
          reviewed: false,
        },
        ai: { standard: 'Isinulat ng AI Teacher', reviewed: false },
        standardActivity: { standard: 'Karaniwang gawain', reviewed: false },
        minutes: {
          standard: '{minutes, plural, one {# minuto} other {# na minuto}}',
          reviewed: false,
        },
        tip: { standard: 'Tip: {tip}', reviewed: false },
      },
      limits: {
        title: { standard: 'Ano ang sinasabi at hindi sinasabi nito.', reviewed: false },
        body: {
          standard:
            'Bawat pagbasa ay may mga limang tanong at isang sample ng boses, kaya malaki ang pagbabago ng mga unang numero. Sumusuporta ito sa pagsasanay sa pagbasa. Hindi ito diagnosis, marka, o kapalit ng paaralan, at hindi kayang ipakita ng ilang pagbasa ang pangmatagalang pagbuti.',
          reviewed: false,
        },
      },
    },
    readings: {
      list: { standard: 'Mga pagbasa', reviewed: false },
      when: { standard: '{date}', reviewed: false },
      level: { standard: 'Antas {level}', reviewed: false },
      result: {
        standard: '{correct} sa {total} tanong · {percent}% ng mga salita ang tama',
        reviewed: false,
      },
      resultNoVoice: {
        standard: '{correct} sa {total} tanong · walang resulta sa boses',
        reviewed: false,
      },
      tries: {
        title: { standard: 'Mga subok sa kuwentong ito', reviewed: false },
        number: { standard: 'Subok', reviewed: false },
        done: { standard: 'Nabasa hanggang dulo', reviewed: false },
        words: { standard: 'Tamang salita', reviewed: false },
        pace: { standard: 'Bilis', reviewed: false },
        yes: { standard: 'Oo', reviewed: false },
        no: { standard: 'Hindi', reviewed: false },
        counted: { standard: '{number} (binilang)', reviewed: false },
        wordsCell: { standard: '{right} sa {total} ({percent}%)', reviewed: false },
        paceCell: { standard: '{wpm} salita kada minuto', reviewed: false },
        scroll: { standard: 'Talaan ng mga subok', reviewed: false },
      },
      words: {
        title: { standard: 'Mga salitang susuriin sa binilang na subok', reviewed: false },
        said: { standard: 'Sabi ng teksto', reviewed: false },
        heard: { standard: 'Narinig', reviewed: false },
        sure: { standard: 'Gaano katiyak', reviewed: false },
        none: { standard: 'Walang salitang susuriin sa subok na ito.', reviewed: false },
        nothing: { standard: 'wala', reviewed: false },
        marked: { standard: 'Namarkahang maling narinig', reviewed: false },
        high: { standard: 'Mataas', reviewed: false },
        medium: { standard: 'Katamtaman', reviewed: false },
        low: { standard: 'Mababa, hindi malinaw ang audio', reviewed: false },
        scroll: { standard: 'Mga salitang susuriin', reviewed: false },
      },
      analysis: {
        title: { standard: 'Pagsusuri ng AI Teacher', reviewed: false },
        based: {
          standard:
            'Batay sa {count, plural, one {# pagkakaiba} other {# na pagkakaiba}} sa antas ng salita sa pagitan ng boses at teksto.',
          reviewed: false,
        },
        ai: { standard: 'Isinulat ng AI Teacher', reviewed: false },
        standardWording: { standard: 'Karaniwang pananalita', reviewed: false },
        none: { standard: 'Wala pang pagsusuri para sa pagbasang ito.', reviewed: false },
      },
      questions: {
        title: { standard: 'Mga tanong', reviewed: false },
        correct: { standard: 'Tama', reviewed: false },
        missed: { standard: 'Mali', reviewed: false },
        chose: { standard: 'Pinili: {chosen}', reviewed: false },
        answer: { standard: 'Sagot: {answer}', reviewed: false },
        evidence: { standard: 'Mula sa kuwento: “{evidence}”', reviewed: false },
      },
    },
    levels: {
      intro: {
        standard:
          'May {max} antas. Habang tumataas ang antas, humahaba at humihirap ang mga kuwento, at bumababa ang mga subok bawat kuwento.',
        reviewed: false,
      },
      table: {
        title: { standard: 'Paano gumagana ang mga antas', reviewed: false },
        levels: { standard: 'Mga antas', reviewed: false },
        length: { standard: 'Haba ng kuwento', reviewed: false },
        words: { standard: 'Mga salita at pangungusap', reviewed: false },
        tries: { standard: 'Subok bawat kuwento', reviewed: false },
        range: { standard: '{from} hanggang {to}', reviewed: false },
        wordsRange: { standard: '{min} hanggang {max} salita', reviewed: false },
        here: { standard: 'Nandito ang anak mo, Antas {level}', reviewed: false },
        scroll: { standard: 'Mga antas, haba ng kuwento at subok', reviewed: false },
      },
      tier: {
        one: { standard: 'Pang-araw-araw na salita at napakaikling pangungusap', reviewed: false },
        two: {
          standard: 'Pang-araw-araw na salita, may ilang bago na ipinaliwanag ng kuwento',
          reviewed: false,
        },
        three: {
          standard: 'Mga pangungusap na may “at”, “pero” at “dahil”, may ilang salitang pampaksa',
          reviewed: false,
        },
        four: { standard: 'Iba-ibang pangungusap, ilang salitang pampaksa', reviewed: false },
        five: {
          standard:
            'Mas mahahabang pangungusap, mga salitang pampaksa, mga detalyeng pagdudugtungin',
          reviewed: false,
        },
        six: { standard: 'Mahirap na bokabularyo at piguratibong wika', reviewed: false },
      },
      history: {
        title: { standard: 'Kasaysayan ng antas', reviewed: false },
        placement: { standard: 'Nagsimula sa Antas {to}', reviewed: false },
        up: { standard: 'Umakyat mula Antas {from} patungong Antas {to}', reviewed: false },
        down: { standard: 'Bumaba mula Antas {from} patungong Antas {to}', reviewed: false },
        list: { standard: 'Mga pagbabago ng antas, pinakabago muna', reviewed: false },
      },
      tries: {
        title: { standard: 'Paano gumagana ang mga subok', reviewed: false },
        one: {
          standard:
            'Ang subok ay isang pagbasa nang malakas ng kuwento. Pagkatapos ng bawat subok, ipinapakita ng AI Teacher kung ano ang aayusin, at maaaring magbasa ulit ang anak mo kung may natitirang subok.',
          reviewed: false,
        },
        two: {
          standard:
            'Kapag naubos na ang mga subok, may isang subok na bibilangin sa resulta, sasagot ang anak mo sa mga tanong, at bibigyan siya ng bagong kuwento na kasing hirap.',
          reviewed: false,
        },
      },
      pass: {
        title: { standard: 'Paano naipapasa ang antas', reviewed: false },
        story: {
          standard:
            'Pasado ang kuwento kapag nabasa ng anak mo nang tama ang hindi bababa sa {words}% ng mga salita sa binilang na subok at tama ang hindi bababa sa {correct} sa {total} tanong.',
          reviewed: false,
        },
        move: {
          standard:
            'Ang pagpasa ng {passes} kuwento sa isang antas ay bahagi ng pag-akyat, at dapat ding ipakita ng mga sagot na handa na ang anak mo. Ang napakahinang resulta ({share}% ng mga tanong o mas mababa ang tama) ay maaaring magpababa ng isang antas para manatiling nababasa ang mga kuwento.',
          reviewed: false,
        },
        evidence: {
          standard:
            'Gumagalaw lang ang antas batay sa ebidensya mula sa mga kuwentong binasa sa kasalukuyang antas. Hindi kailanman nagbabago ng antas ang pagsasanay sa Matuto.',
          reviewed: false,
        },
        tune: {
          standard:
            'Panimulang tuntunin ang mga numerong ito. Maaari silang i-adjust habang dumarating ang tunay na resulta.',
          reviewed: false,
        },
      },
    },
    decisions: {
      intro: {
        standard:
          'Ikaw ang taong sumusuri sa mga ito. Kinukwenta sa code ang mga bilang at antas, hindi hinuhulaan.',
        reviewed: false,
      },
      list: { standard: 'Mga desisyon, pinakabago muna', reviewed: false },
      kinds: {
        story: { standard: 'Kuwento', reviewed: false },
        level: { standard: 'Antas', reviewed: false },
        plan: { standard: 'Plano', reviewed: false },
        analysis: { standard: 'Pagsusuri ng pagbasa', reviewed: false },
        tries: { standard: 'Mga subok', reviewed: false },
      },
      basedOn: { standard: 'Batay sa {title}', reviewed: false },
      messages: {
        analysis: {
          title: { standard: 'Nabilang ang mga sagot sa kuwento', reviewed: false },
          body: {
            standard:
              '{answers, plural, one {# sagot ang nabilang} other {# na sagot ang nabilang}}, {reduced} ang mas mababa ang bilang.',
            reviewed: false,
          },
        },
        levelUp: {
          title: { standard: 'Umakyat sa Antas {level}', reviewed: false },
          body: {
            standard:
              'Sapat ang ebidensya mula sa mga kuwento sa antas na ito. Ang tuntunin ang nagpagalaw ng antas, hindi ang AI.',
            reviewed: false,
          },
        },
        levelDown: {
          title: { standard: 'Bumaba sa Antas {level}', reviewed: false },
          body: {
            standard:
              'Mukhang masyadong mahirap ang antas na ito sa ngayon. Ang tuntunin ang nagpagalaw ng antas, hindi ang AI.',
            reviewed: false,
          },
        },
        focus: {
          title: { standard: 'Ang pokus na kasanayan ay {skill} na', reviewed: false },
          body: {
            standard:
              'Ito ang may pinakamababang pagtataya sa tatlong kasanayan sa pag-unawa. Tuntunin ang pumili nito.',
            reviewed: false,
          },
        },
      },
    },
    privacy: {
      children: {
        title: { standard: 'Mga naka-link na anak', reviewed: false },
        sharing: { standard: 'Ibinabahagi: {sections}', reviewed: false },
        sharingNone: { standard: 'Wala pang ibinabahagi', reviewed: false },
        linked: { standard: 'Naka-link mula {date}', reviewed: false },
        given_by_parent: { standard: 'Pahintulot sa mikropono: ibinigay mo', reviewed: false },
        not_needed: { standard: 'Pahintulot sa mikropono: hindi kailangan', reviewed: false },
        pending: { standard: 'Pahintulot sa mikropono: naghihintay sa iyo', reviewed: false },
        link: { standard: 'Mag-link ng anak', reviewed: false },
        own: {
          standard:
            'Ang anak mo ang may-ari ng kanyang account. Maaari kang tumigil sa pagtingin anumang oras. Maaari ring tumigil sa pagbabahagi ang anak mo.',
          reviewed: false,
        },
      },
      voice: {
        title: { standard: 'Boses at audio', reviewed: false },
        one: {
          standard:
            'Habang nagbabasa nang malakas ang anak mo, ginagawang teksto ang kanyang boses at inihahambing sa kuwento. Itinatapon na ang audio pagkatapos.',
          reviewed: false,
        },
        two: {
          standard:
            'Pasya ng anak mo sa sarili niyang account kung itatago ang mga recording. Hindi kailanman nakikita o naririnig ng mga magulang ang mga recording.',
          reviewed: false,
        },
      },
      data: {
        title: { standard: 'Privacy', reviewed: false },
        whoLabel: { standard: 'Sino ang makakakita ng mga resulta.', reviewed: false },
        who: {
          standard: 'Ang anak mo at, dahil ibinahagi niya, ikaw. Wala nang iba.',
          reviewed: false,
        },
        aiLabel: { standard: 'Ano ang nakikita ng AI model.', reviewed: false },
        ai: {
          standard:
            'Mga antas ng pagbasa, teksto ng kuwento, teksto ng tanong at mga pagkakaiba sa antas ng salita. Hindi kailanman ang pangalan, username o audio ng anak mo.',
          reviewed: false,
        },
        ownLabel: { standard: 'Ang sarili mong data.', reviewed: false },
        own: {
          standard:
            'Ang account mong pang-magulang ay may pangalan mo, email at kung aling mga anak ang naka-link sa iyo lang.',
          reviewed: false,
        },
      },
      actionsNotReady: {
        title: { standard: 'Hindi pa handa ang ilang kasangkapan sa account', reviewed: false },
        body: {
          standard:
            'Lalabas dito ang pagtigil sa pagtingin, pag-download ng data mo bilang magulang at pagbura ng account mo kapag handa na ang mga ito.',
          reviewed: false,
        },
      },
    },
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
  progress: {
    level: { standard: 'Aking antas', simple: 'Aking antas', reviewed: false },
    levelOf: { standard: 'sa {max}', reviewed: false },
    levelBar: {
      standard: 'Progreso patungo sa susunod na antas',
      simple: 'Hakbang sa susunod na antas',
      reviewed: false,
    },
    toNext: {
      standard:
        '{count, plural, one {# kuwento pa para umabot sa Antas {level}} other {# kuwento pa para umabot sa Antas {level}}}',
      simple:
        '{count, plural, one {# kuwento pa sa Antas {level}} other {# kuwento pa sa Antas {level}}}',
      reviewed: false,
    },
    topLevel: {
      standard: 'Nasa pinakamataas ka nang antas.',
      simple: 'Nasa pinakataas ka na.',
      reviewed: false,
    },
    focus: {
      standard: 'Ano ang susunod na pagtutuunan',
      simple: 'Ito ang susunod',
      reviewed: false,
    },
    focusNone: {
      standard: 'Magbasa pa ng ilang kuwento at pipili kami ng kasanayan para sa iyo.',
      simple: 'Magbasa pa para makakuha ng kasanayan.',
      reviewed: false,
    },
    recent: { standard: 'Mga huling kuwento', simple: 'Aking mga kuwento', reviewed: false },
    recentNone: {
      standard: 'Lalabas dito ang iyong mga kuwento kapag may natapos ka na.',
      simple: 'Lalabas dito ang mga natapos.',
      reviewed: false,
    },
    score: { standard: '{correct} sa {total}', reviewed: false },
    scoreLabel: {
      standard: '{correct} sa {total} na tanong ang tama',
      simple: '{correct} sa {total} ang tama',
      reviewed: false,
    },
    empty: {
      title: { standard: 'Wala pang kuwento', simple: 'Wala pang kuwento', reviewed: false },
      body: {
        standard: 'Magbasa ng una mong kuwento at lalabas dito ang iyong progreso.',
        simple: 'Magbasa ng kuwento para makita ang hakbang mo.',
        reviewed: false,
      },
      action: { standard: 'Pumunta sa Home', simple: 'Punta sa Home', reviewed: false },
    },
    skills: {
      vocabulary: { standard: 'Kahulugan ng salita', reviewed: false },
      literal: { standard: 'Paghahanap ng katotohanan', reviewed: false },
      inferential: { standard: 'Pagbasa sa pagitan ng mga linya', reviewed: false },
    },
  },
  language: {
    label: { standard: 'Wika', simple: 'Wika', reviewed: false },
    en: { standard: 'English', reviewed: false },
    fil: { standard: 'Filipino', reviewed: false },
  },
} as const satisfies SameShape<typeof en>;
