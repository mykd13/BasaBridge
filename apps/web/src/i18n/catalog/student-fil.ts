import type { SameShape } from '../types.ts';
import type { studentEn } from './student-en.ts';

/**
 * Filipino wording for the student screens. Every key starts with reviewed: false until a native
 * speaker checks it. See docs/i18n.md.
 */
export const studentFil = {
  common: {
    level: { standard: 'Antas {level}', lowLevel: true, reviewed: false },
    levelOf: { standard: '{level} sa {max}', reviewed: false },
    homeLink: {
      standard: 'Bumalik sa home',
      simple: 'Umuwi',
      lowLevel: true,
      reviewed: false,
    },
    notReadyTitle: {
      standard: 'Hindi pa handa ang bahaging ito',
      simple: 'Hindi pa handa',
      reviewed: false,
    },
    notReadyBody: {
      standard: 'Ginagawa pa namin ito. Pakibalik muli mamaya.',
      simple: 'Ginagawa pa namin ito. Balik ka mamaya.',
      reviewed: false,
    },
    nothingTitle: {
      standard: 'Wala pang maipapakita',
      simple: 'Wala pa rito',
      reviewed: false,
    },
    skillVocabulary: { standard: 'Kahulugan ng salita', reviewed: false },
    skillLiteral: { standard: 'Paghanap ng mga detalye', reviewed: false },
    skillInferential: { standard: 'Pag-unawa sa pagitan ng mga linya', reviewed: false },
    skillVocabularyLower: { standard: 'kahulugan ng salita', reviewed: false },
    skillLiteralLower: { standard: 'paghanap ng mga detalye', reviewed: false },
    skillInferentialLower: { standard: 'pag-unawa sa pagitan ng mga linya', reviewed: false },
    skillDecodingLower: { standard: 'pagbigkas ng mga salita', reviewed: false },
    skillFluencyLower: { standard: 'maayos na pagbasa', reviewed: false },
    triesCount: {
      standard: '{count, plural, one {# subok} other {# subok}} sa bawat kuwento',
      simple: '{count, plural, one {# subok} other {# subok}} bawat kuwento',
      reviewed: false,
    },
    triesUnlimited: {
      standard: 'Kahit ilang subok ang kailangan mo sa bawat kuwento',
      reviewed: false,
    },
    teacherSays: { standard: 'Sabi ng iyong guro', reviewed: false },
    teacherSaysNoNote: {
      standard: 'Magbasa ng kuwento at mag-iiwan ang iyong guro ng tala rito.',
      simple: 'Magbasa ng kuwento. Susulat ang guro rito.',
      reviewed: false,
    },
    micOff: { standard: 'Patay ang mikropono', reviewed: false },
  },

  home: {
    greetingNamed: { standard: 'Kumusta, {name}!', reviewed: false },
    greeting: { standard: 'Kumusta!', reviewed: false },
    readNew: {
      standard: 'Magbasa ng bagong kuwento',
      simple: 'Magbasa ng kuwento',
      lowLevel: true,
      reviewed: false,
    },
    seeProgress: {
      standard: 'Tingnan ang progreso ko',
      simple: 'Aking hakbang',
      lowLevel: true,
      reviewed: false,
    },
    levelEyebrow: { standard: 'Antas mo', lowLevel: true, reviewed: false },
    levelSuffix: { standard: 'sa {max}', reviewed: false },
    levelProgress: {
      standard: '{passed} sa {needed} kuwento ang naipasa para marating ang Antas {next}.',
      simple: '{passed} sa {needed} kuwento ang pasado para sa Antas {next}.',
      reviewed: false,
    },
    levelProgressLabel: {
      standard: 'Progreso patungo sa susunod na antas',
      simple: 'Progreso sa susunod na antas',
      reviewed: false,
    },
    wordsInfo: {
      standard:
        'Ang mga kuwento sa antas na ito ay may mga {min} hanggang {max} salita. Ang mas mataas na antas ay may mas mahahabang kuwento, mas mahihirap na salita at mas kaunting subok.',
      simple: 'Ang mga kuwento rito ay may mga {min} hanggang {max} salita.',
      reviewed: false,
    },
  },

  read: {
    pageTitle: {
      standard: 'Magbasa nang malakas',
      simple: 'Magbasa nang malakas',
      reviewed: false,
    },
    makingTitle: {
      standard: 'Gumagawa ng kuwento',
      simple: 'Kinukuha ang kuwento mo',
      reviewed: false,
    },
    makingBody: {
      standard:
        'Maaari itong abutin ng hanggang isang minuto. Sulit ang paghihintay sa magandang kuwento.',
      simple: 'Maaari itong abutin ng isang minuto.',
      reviewed: false,
    },
    cancel: { standard: 'Kanselahin', lowLevel: true, reviewed: false },
    mic: {
      title: {
        standard: 'Basahin nang malakas ang kuwento',
        simple: 'Magbasa nang malakas',
        lowLevel: true,
        reviewed: false,
      },
      lead: {
        standard:
          'Makikinig ang iyong guro habang nagbabasa ka. Pindutin ang button, saka piliin ang Allow kapag nagtanong ang browser tungkol sa mikropono.',
        simple: 'Pindutin ang button. Saka piliin ang Allow.',
        lowLevel: true,
        reviewed: false,
      },
      notice: {
        standard:
          'Humanap ng tahimik na lugar. Magbasa sa sarili mong bilis. Ginagamit ang boses mo para masundan ang pagbasa at hindi ito itinatago.',
        simple: 'Humanap ng tahimik na lugar. Magbasa nang dahan-dahan.',
        lowLevel: true,
        reviewed: false,
      },
      turnOn: {
        standard: 'Buksan ang mikropono',
        simple: 'Buksan ang mic',
        lowLevel: true,
        reviewed: false,
      },
      cannot: {
        standard: 'Hindi ako makagamit ng mikropono',
        simple: 'Wala akong mikropono',
        lowLevel: true,
        reviewed: false,
      },
      waiting: {
        standard: 'Naghihintay sa browser mo',
        simple: 'Naghihintay',
        lowLevel: true,
        reviewed: false,
      },
      aria: { standard: 'Mikropono', reviewed: false },
    },
    silent: {
      title: {
        standard: 'Basahin nang tahimik ang kuwento',
        simple: 'Basahin ang kuwento',
        reviewed: false,
      },
      lead: {
        standard:
          'Hindi pa pumapayag ang magulang o gabay mo sa mikropono, kaya tahimik ka munang magbabasa. Titingnan namin ulit kapag pumayag na sila.',
        simple: 'Magbabasa ka muna nang walang mic.',
        reviewed: false,
      },
      done: {
        standard: 'Tapos na akong magbasa',
        simple: 'Tapos na ako',
        lowLevel: true,
        reviewed: false,
      },
    },
    session: {
      listening: { standard: 'Nakikinig', lowLevel: true, reviewed: false },
      story: { standard: 'Kuwento', reviewed: false },
      tryEyebrow: { standard: 'Mga subok', reviewed: false },
      tryOf: { standard: 'Subok {n} sa {total}', lowLevel: true, reviewed: false },
      tryOnly: { standard: 'Subok {n}', lowLevel: true, reviewed: false },
      triesRule: {
        standard: 'Ang Antas {level} ay may {total} subok sa bawat kuwento.',
        simple: 'Antas {level}: {total} subok bawat kuwento.',
        reviewed: false,
      },
      triesRuleUnlimited: {
        standard: 'Ang Antas {level} ay may kahit ilang subok na kailangan mo.',
        simple: 'Antas {level}: sumubok nang ilang beses.',
        reviewed: false,
      },
      meter: { standard: 'Lakas ng mikropono', reviewed: false },
      finished: {
        standard: 'Tapos na akong magbasa',
        simple: 'Tapos na ako',
        lowLevel: true,
        reviewed: false,
      },
      stopHere: { standard: 'Tumigil dito', lowLevel: true, reviewed: false },
      startAgain: { standard: 'Magsimulang muli', lowLevel: true, reviewed: false },
    },
    upload: {
      sending: {
        standard: 'Ipinapadala ang pagbasa mo',
        simple: 'Ipinapadala',
        lowLevel: true,
        reviewed: false,
      },
      slow: {
        standard: 'Mabagal ang koneksyon. Sinusubukan pa rin.',
        simple: 'Mabagal ang koneksyon. Sinusubukan pa.',
        reviewed: false,
      },
      done: { standard: 'Tapos na', lowLevel: true, reviewed: false },
      failed: {
        standard: 'Hindi naipadala ang pagbasa mo. Pakisubukan muli.',
        simple: 'Hindi naipadala. Subukan muli.',
        reviewed: false,
      },
      analysing: {
        standard: 'Pinakikinggan ng guro mo ang pagbasa mo',
        simple: 'Sinusuri ang pagbasa mo',
        reviewed: false,
      },
      continue: {
        standard: 'Tingnan kung paano ka bumasa',
        simple: 'Tingnan ang pagbasa ko',
        lowLevel: true,
        reviewed: false,
      },
    },
    problems: {
      tryAgain: { standard: 'Subukan muli', lowLevel: true, reviewed: false },
      back: { standard: 'Bumalik', lowLevel: true, reviewed: false },
      noMicNotice: {
        standard:
          'Walang mikropono sa computer na ito? Maaari ka pa ring magbasa ng kuwento at sumagot ng mga tanong, pero kailangan ng mikropono para sa malakas na pagbasa at sa AI na pagsusuri.',
        simple: 'Walang mikropono? Puwede ka pa ring magbasa at sumagot.',
        reviewed: false,
      },
      denied: {
        title: {
          standard: 'Hindi pa bukas ang mikropono',
          simple: 'Hindi pa bukas ang mic',
          reviewed: false,
        },
        lead: {
          standard:
            'Kailangan kang marinig ng guro mo habang nagbabasa. Pindutin ang Subukan muli, saka piliin ang Allow kapag nagtanong ang browser.',
          simple: 'Pindutin ang Subukan muli. Saka piliin ang Allow.',
          reviewed: false,
        },
      },
      blocked: {
        title: {
          standard: 'Nakapatay ang mikropono',
          simple: 'Nakapatay ang mic',
          reviewed: false,
        },
        lead: {
          standard:
            'Kailangan kang marinig ng guro mo habang nagbabasa. Buksan ang mikropono para sa website na ito, saka subukan muli.',
          simple: 'Buksan ang mic para sa website na ito.',
          reviewed: false,
        },
        step1: {
          standard: 'I-click ang lock o settings icon sa tabi ng web address.',
          simple: 'I-click ang lock sa tabi ng web address.',
          reviewed: false,
        },
        step2: {
          standard: 'Hanapin ang Microphone at piliin ang Allow.',
          simple: 'Hanapin ang Microphone. Piliin ang Allow.',
          reviewed: false,
        },
        step3: {
          standard: 'Bumalik dito at pindutin ang Subukan muli.',
          simple: 'Bumalik. Pindutin ang Subukan muli.',
          reviewed: false,
        },
      },
      noDevice: {
        title: {
          standard: 'Walang nahanap na mikropono',
          simple: 'Walang nahanap na mic',
          reviewed: false,
        },
        lead: {
          standard:
            'Kailangan kang marinig ng guro mo habang nagbabasa. Magsaksak ng mikropono, saka subukan muli.',
          simple: 'Magsaksak ng mikropono. Saka subukan muli.',
          reviewed: false,
        },
      },
      unavailable: {
        title: {
          standard: 'Ginagamit ang mikropono',
          simple: 'Ginagamit ang mic',
          reviewed: false,
        },
        lead: {
          standard:
            'Maaaring ginagamit ng ibang app o tab ang mikropono. Isara ito, saka subukan muli.',
          simple: 'Isara ang ibang app na gumagamit ng mic.',
          reviewed: false,
        },
      },
      unsupported: {
        title: {
          standard: 'Hindi makakapakinig ang browser na ito',
          simple: 'Hindi makakapakinig ang browser na ito',
          reviewed: false,
        },
        lead: {
          standard:
            'Kailangan ng mas bagong browser sa ligtas na pahina para sa malakas na pagbasa. Buksan ang BasaBridge sa pinakabagong Chrome, Safari o Edge.',
          simple: 'Buksan ang BasaBridge sa mas bagong browser.',
          reviewed: false,
        },
      },
      lost: {
        title: {
          standard: 'Tumigil ang mikropono',
          simple: 'Tumigil ang mic',
          reviewed: false,
        },
        lead: {
          standard:
            'Natanggal o namatay ang mikropono habang nagbabasa ka. Tingnan ito, saka subukan muli.',
          simple: 'Tumigil ang mic. Tingnan ito. Saka subukan muli.',
          reviewed: false,
        },
      },
    },
    triesUsed: {
      title: {
        standard: 'Nagamit mo na ang lahat ng {count} subok',
        simple: 'Nagamit mo na ang {count} subok',
        reviewed: false,
      },
      body: {
        standard:
          'Ang pinakamahusay mong subok ay Subok {best}, at iyon ang mabibilang. Susunod, sasagutin mo ang mga tanong, saka magbabasa ng bagong kuwento sa parehong antas.',
        simple: 'Ang Subok {best} ang pinakamahusay. Mabibilang ito. Sagutin na ang mga tanong.',
        reviewed: false,
      },
      listTitle: {
        standard: 'Mga salitang nabasa nang tama sa bawat subok',
        simple: 'Tamang salita sa bawat subok',
        reviewed: false,
      },
      best: { standard: 'pinakamahusay', reviewed: false },
      answer: {
        standard: 'Sagutin ang mga tanong',
        simple: 'Sumagot ng tanong',
        lowLevel: true,
        reviewed: false,
      },
    },
  },

  analysis: {
    pageTitle: { standard: 'Paano ka bumasa', simple: 'Paano ka bumasa', reviewed: false },
    doneTitle: {
      standard: 'Nabasa mo hanggang dulo!',
      simple: 'Nabasa mo lahat!',
      reviewed: false,
    },
    wordsRight: { standard: 'Mga salitang nabasa nang tama', reviewed: false },
    wordsRightValue: { standard: '{right} sa {total}', reviewed: false },
    pace: { standard: 'Bilis ng pagbasa', reviewed: false },
    paceValue: { standard: '{wpm} salita bawat minuto', reviewed: false },
    triesTitle: {
      standard: 'Ang mga subok mo sa kuwentong ito',
      simple: 'Ang mga subok mo',
      reviewed: false,
    },
    tryRow: { standard: 'Subok {n}', reviewed: false },
    tryRowBest: { standard: 'Subok {n}, pinakamahusay', reviewed: false },
    triesLeft: {
      standard:
        '{count, plural, one {# subok pa sa kuwentong ito.} other {# subok pa sa kuwentong ito.}}',
      simple: '{count, plural, one {# subok pa.} other {# subok pa.}}',
      reviewed: false,
    },
    noTriesLeft: {
      standard: 'Wala nang natitirang subok sa kuwentong ito.',
      simple: 'Wala nang subok.',
      reviewed: false,
    },
    noteTitle: {
      standard: 'Napansin ng iyong guro',
      simple: 'Napansin ng guro mo',
      reviewed: false,
    },
    noNote: {
      standard: 'Walang tala ang iyong guro para sa subok na ito.',
      simple: 'Walang tala para sa subok na ito.',
      reviewed: false,
    },
    wordsToPractise: { standard: 'Mga salitang dapat pagsanayan', reviewed: false },
    misheardLead: {
      standard:
        'Hindi ko malinaw na narinig ang mga salitang ito. Kung may mali ako, pindutin ito at aayusin ko.',
      simple: 'Hindi ko narinig ang mga salitang ito. Pindutin kung mali ako.',
      reviewed: false,
    },
    misheardThanks: {
      standard: 'Salamat. Aayusin ko ito.',
      simple: 'Salamat. Aayusin ko ito.',
      reviewed: false,
    },
    misheardWord: {
      standard: 'Pindutin ang “{word}” kung tama ang basa mo',
      simple: 'Pindutin ang “{word}”',
      reviewed: false,
    },
    markFailed: {
      standard: 'Hindi namin ito nai-save. Pakisubukan muli.',
      simple: 'Hindi nai-save. Subukan muli.',
      reviewed: false,
    },
    reviewNotice: {
      standard:
        'May ingay o ibang boses sa subok na ito, kaya hindi ito mabibilang hangga’t hindi nasusuri. Subukan muli sa tahimik na lugar.',
      simple: 'May ingay. Maaaring hindi mabilang ang subok. Subukan sa tahimik na lugar.',
      reviewed: false,
    },
    answer: {
      standard: 'Sagutin ang mga tanong',
      simple: 'Sumagot ng tanong',
      lowLevel: true,
      reviewed: false,
    },
    tryAgain: {
      standard: 'Subukan muli ({count} pa)',
      simple: 'Subukan muli ({count} pa)',
      reviewed: false,
    },
    tryAgainUnlimited: { standard: 'Subukan muli', lowLevel: true, reviewed: false },
    stopped: {
      title: {
        standard: 'Narinig naming tumigil ka sa “{word}”',
        simple: 'Tumigil ka sa “{word}”',
        reviewed: false,
      },
      lead: {
        standard:
          'May kaunti pang babasahin. Tapusin muna natin ang kuwento bago ang mga tanong. Mabibilang lang ito bilang subok {n} sa {total} kapag nakarating ka sa dulo.',
        simple: 'Tapusin muna ang kuwento. Subok {n} ito sa {total}.',
        reviewed: false,
      },
      leadUnlimited: {
        standard: 'May kaunti pang babasahin. Tapusin muna natin ang kuwento bago ang mga tanong.',
        simple: 'May babasahin pa. Tapusin muna ang kuwento.',
        reviewed: false,
      },
      rest: { standard: 'Basahin ang natitira', lowLevel: true, reviewed: false },
      top: { standard: 'Magsimula sa umpisa', lowLevel: true, reviewed: false },
    },
  },

  questions: {
    pageTitle: { standard: 'Tanong', simple: 'Tanong', reviewed: false },
    stepLabel: {
      standard: 'Tanong {n} sa {total}',
      simple: 'Tanong {n} sa {total}',
      reviewed: false,
    },
    steps: { standard: 'Mga tanong', reviewed: false },
    hint: {
      standard: 'Sumagot ayon sa natatandaan mo.',
      simple: 'Isipin ang kuwento.',
      reviewed: false,
    },
    choose: {
      standard: 'Pumili ng sagot para magpatuloy',
      simple: 'Pumili ng sagot',
      reviewed: false,
    },
    check: { standard: 'Suriin ang sagot ko', simple: 'Suriin', lowLevel: true, reviewed: false },
    checking: { standard: 'Sinusuri', lowLevel: true, reviewed: false },
    choices: { standard: 'Mga sagot', reviewed: false },
    listen: {
      standard: 'Pakinggan ang tanong at mga sagot',
      simple: 'Pakinggan',
      reviewed: false,
    },
    listenShort: { standard: 'Pakinggan', lowLevel: true, reviewed: false },
    listenStop: {
      standard: 'Itigil ang pakikinig',
      simple: 'Itigil',
      lowLevel: true,
      reviewed: false,
    },
    saveFailed: {
      standard: 'Hindi namin nasuri ang sagot na iyon. Pakisubukan muli.',
      simple: 'Hindi nasuri. Subukan muli.',
      reviewed: false,
    },
    correct: { standard: 'Tama! Iyan ang sagot.', simple: 'Tama!', reviewed: false },
    wrong: {
      standard: 'Hindi pa tama. Ang sagot ay {letter}: {answer}.',
      simple: 'Hindi pa tama. Ang sagot ay {letter}: {answer}.',
      reviewed: false,
    },
    statusCorrect: { standard: 'Tamang sagot', reviewed: false },
    statusWrong: { standard: 'Ang sagot mo, hindi tama', reviewed: false },
    statusRight: { standard: 'Ang tamang sagot', reviewed: false },
    next: { standard: 'Susunod na tanong', simple: 'Susunod', lowLevel: true, reviewed: false },
    seeResult: {
      standard: 'Tingnan ang resulta ko',
      simple: 'Aking resulta',
      lowLevel: true,
      reviewed: false,
    },
    learn: {
      standard: 'Alamin pa ito',
      simple: 'Alamin ito',
      lowLevel: true,
      reviewed: false,
    },
    doneTitle: {
      standard: 'Nasagot na ang lahat ng tanong',
      simple: 'Nasagot na lahat',
      reviewed: false,
    },
  },

  result: {
    pageTitle: { standard: 'Resulta mo', simple: 'Resulta mo', reviewed: false },
    answered: {
      standard: 'Nasagot mo ang {right} sa {total}',
      simple: 'Tama ang {right} sa {total}',
      reviewed: false,
    },
    readToEnd: { standard: 'Nabasa hanggang dulo', lowLevel: true, reviewed: false },
    notReadToEnd: { standard: 'Hindi nabasa hanggang dulo', reviewed: false },
    silent: { standard: 'Tahimik na binasa', reviewed: false },
    wordsRight: {
      standard: 'Mga salitang nabasa nang tama {pct}%',
      simple: 'Tamang salita {pct}%',
      reviewed: false,
    },
    skillsTitle: { standard: 'Ang mga sagot mo', reviewed: false },
    skillRow: { standard: '{right}/{total}', reviewed: false },
    passed: { standard: 'Pasado ang kuwentong ito.', simple: 'Pasado ka.', reviewed: false },
    notPassed: {
      standard: 'Hindi pasado ang kuwentong ito.',
      simple: 'Hindi pasado ngayon.',
      reviewed: false,
    },
    inARow: {
      standard: '{passed} sa {needed} ang pasado!',
      simple: '{passed} sa {needed} ang pasado',
      reviewed: false,
    },
    inARowLabel: { standard: 'Mga kuwentong pasado patungo sa susunod na antas', reviewed: false },
    newLevel: {
      standard: 'Narating mo ang Antas {level}.',
      simple: 'Narating mo ang Antas {level}.',
      reviewed: false,
    },
    changedLevel: {
      standard: 'Nasa Antas {level} ka na ngayon.',
      simple: 'Nasa Antas {level} ka.',
      reviewed: false,
    },
    seeNewLevel: {
      standard: 'Tingnan ang bago kong antas',
      simple: 'Bago kong antas',
      lowLevel: true,
      reviewed: false,
    },
    done: { standard: 'Tapos na ako', lowLevel: true, reviewed: false },
    another: {
      standard: 'Magbasa ng isa pang kuwento',
      simple: 'Magbasa ng kuwento',
      lowLevel: true,
      reviewed: false,
    },
    learnOffer: {
      standard: 'Magsanay ng {skill} sa Learn.',
      simple: 'Magsanay ng {skill} sa Learn.',
      reviewed: false,
    },
    learnLink: { standard: 'Pumunta sa Learn', simple: 'Learn', lowLevel: true, reviewed: false },
    nothingBody: {
      standard: 'Magbasa ng kuwento at sagutin ang mga tanong. Lalabas dito ang resulta mo.',
      simple: 'Magbasa muna ng kuwento.',
      reviewed: false,
    },
    nothingAction: { standard: 'Magbasa ng kuwento', lowLevel: true, reviewed: false },
  },

  levelUp: {
    pageTitle: {
      standard: 'Umakyat na ang antas',
      simple: 'Umakyat na ang antas',
      reviewed: false,
    },
    eyebrow: { standard: 'Bagong antas', lowLevel: true, reviewed: false },
    passedRow: {
      standard: 'Naipasa mo ang {count} kuwento nang sunud-sunod',
      simple: 'Naipasa mo ang {count} kuwento nang sunud-sunod',
      reviewed: false,
    },
    newTitle: {
      standard: 'Ano ang bago sa Antas {level}',
      simple: 'Bago sa Antas {level}',
      reviewed: false,
    },
    words: { standard: 'Ang mga kuwento ay may mga {min} hanggang {max} salita', reviewed: false },
    harder: {
      standard: 'Ilang mas mahihirap na salita, na ipinaliliwanag ng kuwento sa paligid nito',
      simple: 'Ilang mas mahihirap na salita',
      reviewed: false,
    },
    triesSame: { standard: 'May {count} subok ka pa rin sa bawat kuwento', reviewed: false },
    triesNow: { standard: 'May {count} subok ka na ngayon sa bawat kuwento', reviewed: false },
    triesNext: {
      standard: 'Sa Antas {level}, magkakaroon ka ng {count} subok sa bawat kuwento.',
      simple: 'Sa Antas {level}, {count} subok ang meron ka.',
      reviewed: false,
    },
    read: {
      standard: 'Magbasa ng bagong kuwento',
      simple: 'Magbasa ng kuwento',
      lowLevel: true,
      reviewed: false,
    },
  },

  placement: {
    intro: {
      eyebrow: { standard: 'Maligayang pagdating', lowLevel: true, reviewed: false },
      title: {
        standard: 'Alamin natin ang panimulang antas mo',
        simple: 'Alamin ang antas mo',
        reviewed: false,
      },
      lead: {
        standard:
          'Magbasa ng ilang maikling kuwento at sagutin ang mga tanong. Ipinapakita nito kung saan magsisimula para hindi masyadong mahirap o madali ang mga kuwento. Mga 10 minuto lang ito.',
        simple: 'Magbasa ng ilang maikling kuwento. Mga 10 minuto lang ito.',
        reviewed: false,
      },
      start: { standard: 'Magsimula', lowLevel: true, reviewed: false },
      later: { standard: 'Gawin ito mamaya', simple: 'Mamaya', lowLevel: true, reviewed: false },
      laterNote: {
        standard:
          'Kung gagawin mo ito mamaya, sisimulan ka namin sa madaling antas para sa baitang mo at magtatanong ulit kami.',
        simple: 'Kung mamaya, sisimulan ka sa madaling antas.',
        reviewed: false,
      },
      whatTitle: { standard: 'Ano ang mangyayari', simple: 'Ang mangyayari', reviewed: false },
      step1: {
        standard: 'Magbasa ng kuwento nang malakas',
        simple: 'Magbasa ng kuwento',
        reviewed: false,
      },
      step2: {
        standard: 'Sagutin ang mga tanong tungkol dito',
        simple: 'Sumagot ng tanong',
        reviewed: false,
      },
      step3: {
        standard: 'Makuha ang panimulang antas mo',
        simple: 'Makuha ang antas mo',
        reviewed: false,
      },
      rules: {
        standard:
          'Isang beses mo lang babasahin ang bawat kuwento. Walang pahiwatig sa pagsusulit na ito. Puwede kang tumigil at bumalik.',
        simple: 'Isang beses lang bawat kuwento. Puwede kang bumalik.',
        reviewed: false,
      },
      silentNotice: {
        standard:
          'Hindi pa pumapayag ang magulang o gabay mo sa mikropono, kaya tahimik ka munang magbabasa. Titingnan namin ulit kapag pumayag na sila.',
        simple: 'Walang mikropono muna. Tahimik kang magbabasa.',
        reviewed: false,
      },
      failed: {
        standard: 'Hindi namin magawa iyon. Pakisubukan muli.',
        simple: 'Hindi magawa. Subukan muli.',
        reviewed: false,
      },
    },
    between: {
      eyebrow: {
        standard: 'Hinahanap ang panimulang antas mo',
        simple: 'Hinahanap ang antas mo',
        reviewed: false,
      },
      story: { standard: 'Kuwento {n}', lowLevel: true, reviewed: false },
      title: {
        standard: 'Magandang pagbasa! Isa pang kuwento.',
        simple: 'Magandang pagbasa! Isa pa.',
        reviewed: false,
      },
      body: {
        standard:
          'Hinahanap pa namin ang tamang antas para sa iyo. Maaaring medyo mas madali o mas mahirap ang susunod na kuwento.',
        simple: 'Maaaring mas madali o mas mahirap ang susunod.',
        reviewed: false,
      },
      next: { standard: 'Susunod na kuwento', lowLevel: true, reviewed: false },
      stop: {
        standard: 'Tumigil at bumalik mamaya',
        simple: 'Tumigil muna',
        reviewed: false,
      },
      saved: {
        standard: 'Sine-save namin kung nasaan ka na.',
        simple: 'Sine-save namin kung nasaan ka.',
        reviewed: false,
      },
    },
    result: {
      eyebrow: {
        standard: 'Hinahanap ang panimulang antas mo',
        simple: 'Hinahanap ang antas mo',
        reviewed: false,
      },
      title: {
        standard: 'Panimulang antas mo',
        simple: 'Antas mo',
        lowLevel: true,
        reviewed: false,
      },
      good: {
        standard: 'Magandang panimulang lugar ito. Aakyat ka habang nagbabasa.',
        simple: 'Magandang simula. Aakyat ka habang nagbabasa.',
        reviewed: false,
      },
      guess: {
        standard:
          'Hindi ka namin narinig na nagbasa, kaya hula pa lang ang antas na ito. Magbabago ito habang nagbabasa ka.',
        simple: 'Hula pa lang ang antas na ito.',
        reviewed: false,
      },
      start: { standard: 'Magsimulang magbasa', lowLevel: true, reviewed: false },
      retake: {
        standard: 'Maaari mong ulitin ang pagsusulit na ito pagkatapos ng {days} araw.',
        simple: 'Puwede ulit pagkalipas ng {days} araw.',
        reviewed: false,
      },
      noticed: { standard: 'Ang napansin namin', simple: 'Ang nakita namin', reviewed: false },
      strong: { standard: 'Magaling sa {skill}', reviewed: false },
      practise: { standard: 'Pagsasanay: {skill}', reviewed: false },
      learnNote: {
        standard: 'Makakatulong ang Learn sa {skill} anumang oras na gusto mo.',
        simple: 'Makakatulong ang Learn sa {skill}.',
        reviewed: false,
      },
      learnLink: { standard: 'Tingnan ang Learn', lowLevel: true, reviewed: false },
      helpTitle: {
        standard: 'Bukas ang dagdag na tulong',
        simple: 'Bukas ang dagdag na tulong',
        reviewed: false,
      },
      helpBody: {
        standard:
          'Pasalitang panuto, mas malaking teksto at reading ruler. Puwede mong baguhin ang alinman dito.',
        simple: 'Pasalitang salita, malaking teksto at ruler.',
        reviewed: false,
      },
      helpLink: {
        standard: 'Baguhin ang tulong sa pagbasa',
        simple: 'Baguhin ang tulong',
        reviewed: false,
      },
    },
  },
} as const satisfies SameShape<typeof studentEn>;
