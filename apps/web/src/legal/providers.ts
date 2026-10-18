/**
 * Every outside service that handles data, and what it sees and never sees (BB-69). The privacy
 * notice draws its provider table from this list.
 *
 * A test fails when `example.env` has a `*_PROVIDER` or `*_MODEL` variable that no entry lists in
 * `envVars`, so adding a provider to the environment forces an entry here. The text is a draft:
 * the sees and never-sees lines must match what the code sends (golden rule 2) and the terms in
 * `docs/security/provider-terms.md`, which nobody has verified yet. Filipino text is unreviewed.
 */
import type { Lang } from '@/i18n/types';

export type Localized = Record<Lang, string>;

export interface Provider {
  id: string;
  name: Localized;
  /** `decided: false` means the provider is not chosen yet. The notice says so. */
  decided: boolean;
  purpose: Localized;
  sees: Localized;
  neverSees: Localized;
  /** Environment variables that choose this provider or its models. */
  envVars: readonly string[];
  /** Feature flag that can change the models without a deploy (BB-65, `model_choices`). */
  flag?: string;
}

export const PROVIDERS: readonly Provider[] = [
  {
    id: 'ai-gateway-gemini',
    name: { en: 'Vercel AI Gateway and Google Gemini', fil: 'Vercel AI Gateway at Google Gemini' },
    decided: true,
    purpose: {
      en: 'Writes the stories, checks them, and writes the short notes from the AI Teacher.',
      fil: 'Sumusulat ng mga kuwento, sumusuri sa mga ito, at sumusulat ng maikling tala ng AI Teacher.',
    },
    sees: {
      en: 'The story text, the reading level, counts, and the words that differed from the text.',
      fil: 'Ang teksto ng kuwento, ang antas ng pagbasa, mga bilang, at ang mga salitang naiiba sa teksto.',
    },
    neverSees: {
      en: 'Names, usernames, email addresses, ids, or audio.',
      fil: 'Mga pangalan, username, email address, id, o audio.',
    },
    envVars: ['STORY_MODEL', 'VERIFIER_MODEL', 'NOTES_MODEL', 'AI_GATEWAY_API_KEY'],
    flag: 'model_choices',
  },
  {
    id: 'azure-speech-tts',
    name: { en: 'Azure Speech (text to speech)', fil: 'Azure Speech (text to speech)' },
    decided: true,
    purpose: {
      en: 'Reads fixed interface sentences out loud in English and Filipino.',
      fil: 'Binabasa nang malakas ang mga nakatakdang pangungusap sa app sa Ingles at Filipino.',
    },
    sees: {
      en: 'The sentence to be spoken and its language.',
      fil: 'Ang pangungusap na babasahin at ang wika nito.',
    },
    neverSees: {
      en: 'Names, usernames, ids, or recordings of the learner.',
      fil: 'Mga pangalan, username, id, o pag-record ng mag-aaral.',
    },
    envVars: ['TTS_PROVIDER', 'TTS_API_KEY', 'TTS_REGION'],
  },
  {
    id: 'speech-recognition',
    name: {
      en: 'Speech provider (not chosen yet)',
      fil: 'Speech provider (hindi pa napipili)',
    },
    decided: false,
    purpose: {
      en: 'Turns the learner reading out loud into words with timings, so code can compare them with the story.',
      fil: 'Ginagawang mga salita na may oras ang pagbasa ng mag-aaral, para maihambing ng code sa kuwento.',
    },
    sees: {
      en: 'The audio of the learner reading, while it is being analysed.',
      fil: 'Ang audio ng pagbasa ng mag-aaral, habang sinusuri ito.',
    },
    neverSees: {
      en: 'Names, usernames, or email addresses.',
      fil: 'Mga pangalan, username, o email address.',
    },
    envVars: ['SPEECH_PROVIDER', 'SPEECH_API_KEY'],
  },
  {
    id: 'vercel-postgres',
    name: { en: 'Vercel and Postgres', fil: 'Vercel at Postgres' },
    decided: true,
    purpose: {
      en: 'Runs the app and stores the accounts and the results.',
      fil: 'Pinapatakbo ang app at iniimbak ang mga account at resulta.',
    },
    sees: {
      en: 'What we store: usernames, age band, reading results, answers, and, only if the learner turns it on, encrypted recordings.',
      fil: 'Ang iniimbak namin: mga username, age band, resulta ng pagbasa, mga sagot, at, kung bubuksan lamang ng mag-aaral, mga naka-encrypt na recording.',
    },
    neverSees: {
      en: 'Passwords in plain text. We keep only a scrambled copy.',
      fil: 'Mga password sa plain text. Scrambled na kopya lamang ang iniimbak namin.',
    },
    envVars: ['DATABASE_URL'],
  },
  {
    id: 'email',
    name: { en: 'Email provider (not chosen yet)', fil: 'Email provider (hindi pa napipili)' },
    decided: false,
    purpose: {
      en: 'Sends the approval request to a parent or guardian and password reset emails.',
      fil: 'Nagpapadala ng hiling na pag-apruba sa magulang o tagapag-alaga at ng email para sa pag-reset ng password.',
    },
    sees: {
      en: 'The email address it sends to and the text of that message.',
      fil: 'Ang email address na pinadadalhan at ang teksto ng mensahe.',
    },
    neverSees: {
      en: 'Audio, answers, or reading results.',
      fil: 'Audio, mga sagot, o resulta ng pagbasa.',
    },
    envVars: ['EMAIL_PROVIDER', 'EMAIL_API_KEY'],
  },
];

/** Variables in example.env that choose a provider or a model. Each one must be listed above. */
export const PROVIDER_VAR_PATTERN = /(_PROVIDER|_MODEL)$/;

export function listedEnvVars(): Set<string> {
  return new Set(PROVIDERS.flatMap((p) => p.envVars));
}
