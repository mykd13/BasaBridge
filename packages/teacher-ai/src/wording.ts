/**
 * Fixed wording for teacher notes, keyed in English and Filipino, standard and simple.
 *
 * This follows the interface catalog format (docs/i18n.md, BB-58): each key has a `standard`
 * wording, an optional `simple` wording, and Filipino entries start with `reviewed: false` until a
 * native speaker checks them. Keys and entries are shaped so they can move into the web catalog
 * as they are. The web catalog lives in apps/web, which this package cannot import, so the same
 * keys are kept here until the notes screens read them from one place.
 */
import type { ComprehensionSkill } from '@basabridge/contracts';

export type Lang = 'en' | 'fil';
export type Wording = 'simple' | 'standard';

export interface NotesStyle {
  lang?: Lang;
  wording?: Wording;
}

export interface WordingEntry {
  standard: string;
  /** Shorter, plainer wording. Falls back to standard. */
  simple?: string;
  /** A native speaker has checked this Filipino wording. */
  reviewed?: boolean;
}

export const NOTES_EN = {
  'notes.child.levelUp': {
    standard: 'You moved up a level! Your careful reading is paying off.',
    simple: 'You moved up a level! Well done!',
  },
  'notes.child.levelDown': {
    standard: 'Your next stories will feel a little lighter. Take your time and enjoy them.',
    simple: 'Your next stories are a bit easier.',
  },
  'notes.child.passed': {
    standard: 'Great reading! You found the answers in the story.',
    simple: 'Great reading! You found the answers.',
  },
  'notes.child.keepGoing': {
    standard: 'Thank you for reading today. Every story helps you grow as a reader.',
    simple: 'Thank you for reading. Keep going!',
  },
  'notes.parent.answered': { standard: 'Answered {correct} of {total} questions correctly.' },
  'notes.parent.words': {
    standard: 'Read {right} of {total} words right on the counted try.',
  },
  'notes.parent.levelUp': { standard: 'Moved up to level {level}.' },
  'notes.parent.levelDown': {
    standard: 'Moved to level {level} for more practice at an easier step.',
  },
  'notes.parent.levelSame': { standard: 'Stays at level {level}.' },
  'notes.focus.none': {
    standard:
      'There is not enough evidence yet to pick a focus skill, so the next stories keep a balanced mix of questions.',
  },
  'notes.focus.some': {
    standard:
      'The next stories add extra questions on {skill}, because it is the skill with the most room to grow so far.',
  },
  'notes.skill.vocabulary': { standard: 'working out what words mean' },
  'notes.skill.literal': { standard: 'finding details in the text' },
  'notes.skill.inferential': { standard: 'reading between the lines' },
  'notes.source.ai': { standard: 'Notes written by the AI Teacher' },
  'notes.source.standard': { standard: 'Notes in standard wording' },
  'notes.decision.rule': { standard: 'The focus skill was chosen by rule, not by the AI.' },
  'notes.decision.noFocus': {
    standard: 'There was not enough evidence to pick a focus skill.',
  },
  'notes.activity.vocabulary.title': { standard: 'Word detective' },
  'notes.activity.vocabulary.step1': {
    standard: 'Pick three words from the story that felt tricky.',
  },
  'notes.activity.vocabulary.step2': {
    standard: 'Ask: "What do you think it means? Which words nearby help you?"',
  },
  'notes.activity.vocabulary.step3': {
    standard: 'Use each word in a new sentence about your day.',
  },
  'notes.activity.vocabulary.tip': {
    standard: 'Say the meaning in your own words before you reach for a dictionary.',
  },
  'notes.activity.literal.title': { standard: 'Find it in the text' },
  'notes.activity.literal.step1': { standard: 'Reread one paragraph of the story together.' },
  'notes.activity.literal.step2': { standard: 'Ask a who, what or where question about it.' },
  'notes.activity.literal.step3': {
    standard: 'Have your child point to the exact words that answer it.',
  },
  'notes.activity.literal.tip': {
    standard: 'Pointing at the words trains the habit of checking the text.',
  },
  'notes.activity.inferential.title': { standard: 'Clue hunt' },
  'notes.activity.inferential.step1': { standard: 'Read two or three sentences together.' },
  'notes.activity.inferential.step2': {
    standard: 'Ask: "What is not said, but you can tell?"',
  },
  'notes.activity.inferential.step3': {
    standard: 'Ask: "Which words gave you that clue?" and find them.',
  },
  'notes.activity.inferential.tip': {
    standard: 'There is no single right answer if the child can name a clue from the text.',
  },
} as const satisfies Record<string, WordingEntry>;

export type NotesKey = keyof typeof NOTES_EN;

/** Filipino wording. Every entry is reviewed: false until a native speaker checks it. */
export const NOTES_FIL = {
  'notes.child.levelUp': {
    standard: 'Umakyat ka ng antas! Nagbubunga ang maingat mong pagbabasa.',
    simple: 'Umakyat ka ng antas! Galing mo!',
    reviewed: false,
  },
  'notes.child.levelDown': {
    standard: 'Magiging mas magaan ang susunod mong mga kuwento. Dahan-dahan lang at mag-enjoy.',
    simple: 'Mas madali ang susunod na kuwento.',
    reviewed: false,
  },
  'notes.child.passed': {
    standard: 'Magaling kang magbasa! Nahanap mo ang mga sagot sa kuwento.',
    simple: 'Galing mo! Nahanap mo ang mga sagot.',
    reviewed: false,
  },
  'notes.child.keepGoing': {
    standard:
      'Salamat sa pagbabasa ngayon. Bawat kuwento ay tumutulong sa iyong lumago bilang mambabasa.',
    simple: 'Salamat sa pagbabasa. Tuloy lang!',
    reviewed: false,
  },
  'notes.parent.answered': {
    standard: 'Sumagot nang tama sa {correct} sa {total} tanong.',
    reviewed: false,
  },
  'notes.parent.words': {
    standard: 'Nabasa nang tama ang {right} sa {total} salita sa binilang na pagsubok.',
    reviewed: false,
  },
  'notes.parent.levelUp': { standard: 'Umakyat sa antas {level}.', reviewed: false },
  'notes.parent.levelDown': {
    standard: 'Lumipat sa antas {level} para sa mas maraming pagsasanay sa mas madaling hakbang.',
    reviewed: false,
  },
  'notes.parent.levelSame': { standard: 'Nananatili sa antas {level}.', reviewed: false },
  'notes.focus.none': {
    standard:
      'Wala pang sapat na ebidensya para pumili ng pangunahing kasanayan, kaya may balanseng halo ng mga tanong ang susunod na mga kuwento.',
    reviewed: false,
  },
  'notes.focus.some': {
    standard:
      'Magdaragdag ang susunod na mga kuwento ng mga tanong tungkol sa {skill}, dahil ito ang kasanayang may pinakamalaking lugar para umunlad sa ngayon.',
    reviewed: false,
  },
  'notes.skill.vocabulary': { standard: 'pag-alam sa kahulugan ng mga salita', reviewed: false },
  'notes.skill.literal': { standard: 'paghahanap ng mga detalye sa teksto', reviewed: false },
  'notes.skill.inferential': { standard: 'pagbasa sa pagitan ng mga linya', reviewed: false },
  'notes.source.ai': { standard: 'Mga tala na isinulat ng AI Teacher', reviewed: false },
  'notes.source.standard': { standard: 'Mga tala sa karaniwang pananalita', reviewed: false },
  'notes.decision.rule': {
    standard: 'Pinili ayon sa patakaran ang pangunahing kasanayan, hindi ng AI.',
    reviewed: false,
  },
  'notes.decision.noFocus': {
    standard: 'Kulang pa ang ebidensya para pumili ng pangunahing kasanayan.',
    reviewed: false,
  },
  'notes.activity.vocabulary.title': { standard: 'Tiktik ng salita', reviewed: false },
  'notes.activity.vocabulary.step1': {
    standard: 'Pumili ng tatlong salita mula sa kuwento na mahirap para sa iyo.',
    reviewed: false,
  },
  'notes.activity.vocabulary.step2': {
    standard:
      'Itanong: "Ano sa tingin mo ang ibig sabihin nito? Anong mga salita sa tabi nito ang tumutulong?"',
    reviewed: false,
  },
  'notes.activity.vocabulary.step3': {
    standard: 'Gamitin ang bawat salita sa bagong pangungusap tungkol sa iyong araw.',
    reviewed: false,
  },
  'notes.activity.vocabulary.tip': {
    standard: 'Sabihin muna ang kahulugan sa sarili mong salita bago kumuha ng diksiyonaryo.',
    reviewed: false,
  },
  'notes.activity.literal.title': { standard: 'Hanapin sa teksto', reviewed: false },
  'notes.activity.literal.step1': {
    standard: 'Basahin muli nang magkasama ang isang talata ng kuwento.',
    reviewed: false,
  },
  'notes.activity.literal.step2': {
    standard: 'Magtanong ng tungkol sa sino, ano o saan mula roon.',
    reviewed: false,
  },
  'notes.activity.literal.step3': {
    standard: 'Ipaturo sa iyong anak ang eksaktong mga salitang sumasagot dito.',
    reviewed: false,
  },
  'notes.activity.literal.tip': {
    standard: 'Ang pagturo sa mga salita ay nagsasanay ng ugaling tingnan ang teksto.',
    reviewed: false,
  },
  'notes.activity.inferential.title': { standard: 'Hanap-pahiwatig', reviewed: false },
  'notes.activity.inferential.step1': {
    standard: 'Basahin nang magkasama ang dalawa o tatlong pangungusap.',
    reviewed: false,
  },
  'notes.activity.inferential.step2': {
    standard: 'Itanong: "Ano ang hindi sinabi pero masasabi mo?"',
    reviewed: false,
  },
  'notes.activity.inferential.step3': {
    standard:
      'Itanong: "Anong mga salita ang nagbigay ng pahiwatig na iyon?" at hanapin ang mga ito.',
    reviewed: false,
  },
  'notes.activity.inferential.tip': {
    standard: 'Walang iisang tamang sagot basta mapangalanan ng bata ang pahiwatig mula sa teksto.',
    reviewed: false,
  },
} as const satisfies Record<NotesKey, WordingEntry>;

const CATALOGS: Record<Lang, Record<NotesKey, WordingEntry>> = { en: NOTES_EN, fil: NOTES_FIL };

/** One fixed message, with `{name}` placeholders filled in. Simple falls back to standard. */
export function say(
  key: NotesKey,
  params: Record<string, string | number> = {},
  style: NotesStyle = {},
): string {
  const entry = CATALOGS[style.lang ?? 'en'][key];
  const text = style.wording === 'simple' ? (entry.simple ?? entry.standard) : entry.standard;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

export const skillKey = (skill: ComprehensionSkill): NotesKey => `notes.skill.${skill}`;
