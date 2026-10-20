/**
 * Common English idioms that a young Filipino reader would take literally (BB-72). Stories in tiers
 * where `idiomsAllowed` is false must not use them. Pure data and one pure function: no model
 * calls, no learner data.
 *
 * Only idioms that are almost never meant literally are listed, so a story about a real cake or a
 * real bell is not rejected. `{pos}` stands for my, your, his, her, its, our or their, `{s}` for
 * an optional verb ending, and `{be}` for is, was, are, were, be or 's.
 */
const IDIOMS: readonly string[] = [
  '{be} a piece of cake',
  'raining cats and dogs',
  'break a leg',
  'under the weather',
  'hit{s} the books',
  'hit{s} the sack',
  'hit{s} the hay',
  'spill{s} the beans',
  'spilled the beans',
  'let the cat out of the bag',
  'once in a blue moon',
  'cost{s} an arm and a leg',
  'bite the bullet',
  'hit the nail on the head',
  'beat{s} around the bush',
  'the ball is in {pos} court',
  'call{s} it a day',
  'called it a day',
  'cut{s} corners',
  'hang in there',
  'pull{s} {pos} leg',
  'pulling {pos} leg',
  'kill two birds with one stone',
  'blessing in disguise',
  'cry over spilled milk',
  'cry over spilt milk',
  'see eye to eye',
  'on cloud nine',
  'butterflies in {pos} stomach',
  'got cold feet',
  'get cold feet',
  'the last straw',
  'back to square one',
  'by the skin of {pos} teeth',
  'apple of {pos} eye',
  'a dime a dozen',
  'jump on the bandwagon',
  'kick{s} the bucket',
  'kicked the bucket',
  'when pigs fly',
  'add fuel to the fire',
  'out of the blue',
  'steal{s} the show',
  'stole the show',
  'a penny for {pos} thoughts',
  'rule of thumb',
  'barking up the wrong tree',
  'let sleeping dogs lie',
  'the elephant in the room',
  'go the extra mile',
  'went the extra mile',
  'cat got {pos} tongue',
  'a taste of {pos} own medicine',
  'actions speak louder than words',
  'easier said than done',
  'every cloud has a silver lining',
  'in a nutshell',
  'on thin ice',
  'sick and tired',
  'the best of both worlds',
  'time flies',
  'water under the bridge',
];

const POSSESSIVE = '(?:my|your|his|her|its|our|their)';
/** A form of "be" as its own word, or 's joined to the word before ("it's"). */
const BE = "(?:(?<![a-z])(?:is|was|are|were|be)|'s)";

const PATTERNS: readonly RegExp[] = IDIOMS.map((idiom) => {
  const source = idiom
    .split(' ')
    .map((word) => word.replace('{pos}', POSSESSIVE).replace('{s}', '(?:s|es)?'))
    .join('\\s+');
  const start = source.startsWith('{be}') ? '' : '(?<![a-z])';
  return new RegExp(`${start}${source.replace('{be}', BE)}(?![a-z])`);
});

/** How many listed idioms appear in the passage. Counts only, so feedback never repeats text. */
export function countIdioms(passage: string): number {
  const text = passage.toLowerCase().replace(/[‘’]/g, "'");
  return PATTERNS.filter((re) => re.test(text)).length;
}

/** The number of idioms on the list, for the README and tests. */
export const IDIOM_COUNT = IDIOMS.length;
