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
  language: {
    label: { standard: 'Wika', simple: 'Wika', reviewed: false },
    en: { standard: 'English', reviewed: false },
    fil: { standard: 'Filipino', reviewed: false },
  },
} as const satisfies SameShape<typeof en>;
