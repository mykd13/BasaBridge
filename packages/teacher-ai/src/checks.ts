/**
 * Shape, length, tone, claim and safety checks for model output. Notes that fail any check are
 * replaced by standard wording; they are never repaired or shown.
 */
import { ModelNotes, type NotesFacts } from './schema';

export type ToneProblem =
  | 'child_number'
  | 'child_score'
  | 'shaming'
  | 'promise'
  | 'unknown_number'
  | 'wrong_claim'
  | 'unsafe_content';

/** Number words in English and Filipino, with the value they stand for. */
const WORD_VALUES: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  isa: 1,
  dalawa: 2,
  tatlo: 3,
  apat: 4,
  lima: 5,
  anim: 6,
  pito: 7,
  walo: 8,
  siyam: 9,
  sampu: 10,
};
const NUMBER_WORD_LIST = Object.keys(WORD_VALUES).join('|');
const NUMBER_WORD = new RegExp(`\\b(${NUMBER_WORD_LIST})\\b`, 'gi');
/** Words a child note must not carry at all: counts, ranks and scores. */
const CHILD_NUMBER_WORDS = new RegExp(
  `\\b(${NUMBER_WORD_LIST}|hundred|half|percent|first|second|third|fourth|fifth|una|pangalawa|ikalawa|pangatlo|ikatlo)\\b`,
  'i',
);
const SCORE_WORDS =
  /%|\b(score[sd]?|points?|marks?|grades?|out of|correct answers?|right answers?|marka|puntos)\b/i;
/** "Behind" shames only as falling behind, so "the idea behind the words" stays allowed. */
const SHAMING =
  /\b(lazy|stupid|dumb|careless|bad|poor(ly)?|weak|fail(s|ed|ure)?|disappoint(ing|ed)?|not trying|should have known|(?:fall(?:s|ing|en)?|fell|is|are|was|were|left) behind|behind (?:the )?(?:others|class|classmates|other (?:kids|children|learners))|wrong|mistakes?|slow(er|ly)?|struggl(e|es|ed|ing)|tamad|bobo|tanga|mahina|bagal|palpak)\b/i;

/** Future wording. A sentence that has one and a topic word below is a promise. */
const FUTURE =
  /\b(will|won't|you'll|you’ll|they'll|they’ll|he'll|she'll|shall|going to|gonna|guarantee[sd]?|sure to|certain to|soon|magiging|aakyat|papasa)\b/i;
const PROMISE_TOPIC = /\b(level|score|pass|grade|points?|marks?|move up|antas|marka|puntos)\b/i;

const PASS_WORDS = /\b(passed|nakapasa|pumasa)\b/i;
const NOT_PASS = /\b(not|n't|n’t|never|hindi|di)\s+(yet\s+)?(pass|passed|nakapasa|pumasa)\b/i;
const UP_WORDS =
  /\b(moved up|move up|moves up|level(?:ed|led)? up|went up|go up|goes up|promoted|advanced|umakyat|tumaas)\b/i;
const NOT_UP =
  /\b(not|n't|n’t|never|hindi|di|no)\s+(?:yet\s+)?(?:\w+\s+)?(moved up|move up|level up|go up|went up|umakyat|tumaas)\b/i;
const DOWN_WORDS =
  /\b(moved down|move down|went down|go down|dropped|bumped down|demoted|bumaba)\b/i;

const URL =
  /\b(https?:\/\/|www\.)|\b[a-z0-9-]+\.(com|net|org|ph|io|co|edu|gov|info|app|xyz|me|ly|ai)\b/i;
const EMAIL = /[^\s@]+@[^\s@]+/;
const PHONE = /\+\s*\d|\d[\d\s().-]{6,}\d/;
const CONTACT_WORDS =
  /\b(download|install|click|subscribe|whatsapp|facebook|messenger|telegram|instagram|tiktok|viber|snapchat|discord|dm me)\b/i;
const PERSONAL_REQUEST =
  /\b(tell|send|share|give|post|upload|enter|type|write|text|email|call|message|ibigay|ipadala)\b[^.!?]*\b(your|my|their|her|his|child's|full|real|home|iyong|inyong)\b[^.!?]*\b(name|address|school|phone|number|password|photo|picture|selfie|email|birthday|age|pangalan|paaralan)\b/i;
const PHOTO_REQUEST =
  /\b(send|share|post|upload|take)\b[^.!?]*\b(photo|picture|selfie|video|litrato)\b/i;

/** "level 7" in English, "antas 7" in Filipino. */
const LEVEL_NUMBER = /\b(?:level|antas)\s+(\d+)/gi;
const LEVEL_BEFORE = /\b(?:level|antas)\s+$/i;
const COUNTING_AFTER = /^\s+(of|out|question|word|answer|point|level|antas|time|try|tama|mali)\b/i;

function fields(n: ModelNotes): string[] {
  return [
    n.childMessage,
    n.whatHappened,
    n.whyFocus,
    n.homeActivity.title,
    n.homeActivity.tip,
    ...n.homeActivity.steps,
  ];
}

function sentences(t: string): string[] {
  return t.split(/(?<=[.!?])\s+/);
}

/**
 * Replaces number words with digits so "four of five" is checked like "4 of 5". "one" and "isa"
 * are also pronouns and articles, so they count only in a counting phrase.
 */
function digitize(t: string): string {
  return t.replace(NUMBER_WORD, (w, _g, offset: number, whole: string) => {
    const value = WORD_VALUES[w.toLowerCase()] ?? 0;
    if (value === 1) {
      const counting =
        COUNTING_AFTER.test(whole.slice(offset + w.length)) ||
        LEVEL_BEFORE.test(whole.slice(0, offset));
      if (!counting) return w;
    }
    return String(value);
  });
}

/** Tone problems in a set of notes. Empty when the notes are fine. */
export function toneProblems(raw: ModelNotes, facts: NotesFacts): ToneProblem[] {
  // Full-width digits and other look-alike forms are folded to plain ones before any check.
  const n: ModelNotes = JSON.parse(JSON.stringify(raw), (_k, v) =>
    typeof v === 'string' ? v.normalize('NFKC') : v,
  );
  const problems = new Set<ToneProblem>();
  const child = n.childMessage;
  if (/\d/.test(child) || CHILD_NUMBER_WORDS.test(child)) problems.add('child_number');
  if (SCORE_WORDS.test(child)) problems.add('child_score');

  const all = fields(n);
  if (all.some((t) => SHAMING.test(t))) problems.add('shaming');

  // A promise is a future claim about a score, a level or passing. Code decides those, not notes.
  // "level by level" is the usual wording for steady practice, not a claim about a level.
  const promised = all.some((t) =>
    sentences(t.replace(/\blevel by level\b/gi, 'step by step')).some(
      (s) => FUTURE.test(s) && PROMISE_TOPIC.test(s),
    ),
  );
  if (promised) problems.add('promise');

  // Safety: no links, contact details or requests for personal information, in any field.
  if (
    all.some(
      (t) =>
        URL.test(t) ||
        EMAIL.test(t) ||
        PHONE.test(t) ||
        CONTACT_WORDS.test(t) ||
        PERSONAL_REQUEST.test(t) ||
        PHOTO_REQUEST.test(t),
    )
  ) {
    problems.add('unsafe_content');
  }

  // Claims about pass and level movement must match what code decided.
  const claimed = all.join(' ');
  if (!facts.passed && PASS_WORDS.test(claimed) && !NOT_PASS.test(claimed)) {
    problems.add('wrong_claim');
  }
  if (facts.passed && NOT_PASS.test(claimed)) problems.add('wrong_claim');
  if (facts.levelAfter <= facts.levelBefore && UP_WORDS.test(claimed) && !NOT_UP.test(claimed)) {
    problems.add('wrong_claim');
  }
  if (facts.levelAfter >= facts.levelBefore && DOWN_WORDS.test(claimed)) {
    problems.add('wrong_claim');
  }

  // The parent may see numbers, but only the ones code gave the model. Levels and counts are
  // kept apart, so a count cannot stand in for a level.
  const counts = new Set(
    [
      facts.correct,
      facts.total,
      facts.total - facts.correct,
      facts.wordsRight,
      facts.wordsTotal,
      facts.missed.length,
      facts.flaggedWords.length,
      facts.wordsRight != null && facts.wordsTotal != null
        ? facts.wordsTotal - facts.wordsRight
        : null,
    ]
      .filter((v): v is number => v != null)
      .map(String),
  );
  const levels = new Set([String(facts.levelBefore), String(facts.levelAfter)]);
  const parent = digitize(`${n.whatHappened} ${n.whyFocus}`);
  for (const m of parent.matchAll(LEVEL_NUMBER)) {
    if (!levels.has(m[1] ?? '')) problems.add('unknown_number');
  }
  const withoutLevels = parent.replace(LEVEL_NUMBER, ' ');
  for (const m of withoutLevels.matchAll(/\d+/g)) {
    if (!counts.has(m[0])) problems.add('unknown_number');
  }
  // "X of Y" must be one of the real pairs, so a known number cannot stand in for another.
  const pairs = new Set([`${facts.correct}/${facts.total}`]);
  if (facts.wordsRight != null && facts.wordsTotal != null) {
    pairs.add(`${facts.wordsRight}/${facts.wordsTotal}`);
  }
  for (const m of parent.matchAll(/(\d+)\s+(?:of|out of|sa)\s+(\d+)/gi)) {
    if (!pairs.has(`${m[1]}/${m[2]}`)) problems.add('unknown_number');
  }

  return [...problems];
}

export type CheckResult =
  | { ok: true; notes: ModelNotes }
  | { ok: false; reason: 'invalid_shape' }
  | { ok: false; reason: 'tone'; problems: ToneProblem[] };

/** Shape and length first, then tone, claims and safety. */
export function checkNotes(raw: unknown, facts: NotesFacts): CheckResult {
  const parsed = ModelNotes.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: 'invalid_shape' };
  const problems = toneProblems(parsed.data, facts);
  if (problems.length) return { ok: false, reason: 'tone', problems };
  return { ok: true, notes: parsed.data };
}
