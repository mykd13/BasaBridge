// Type imports only. This file is in the layout of every student page, so it must not pull
// zod or the contracts package into the browser bundle. The preset values come from the server
// page as props, and a test keeps DEFAULT_STATE equal to the contract defaults.
import type { Accommodation, ReadingHelp as ReadingHelpSettings } from '@basabridge/contracts';

/**
 * What the screen edits: the contract's ReadingHelp plus one per-device field.
 * `highContrast` is not in the contract yet (see the BB-59 PR), so it is kept in this
 * browser only and never sent to the server.
 */
export type ReadingHelpState = ReadingHelpSettings & { highContrast: boolean };

export const DEFAULT_STATE: ReadingHelpState = {
  audioInstructions: false,
  questionReadAloud: false,
  textSize: 'medium',
  lineSpacing: 'normal',
  readingRuler: false,
  language: 'en',
  simpleWords: false,
  listenThenRead: true,
  highContrast: false,
};

export const PRESET_NAMES = ['standard', 'more'] as const;
export type PresetName = (typeof PRESET_NAMES)[number];
/** The contract's READING_HELP_PRESETS, passed in from a server component. */
export type Presets = Record<PresetName, ReadingHelpSettings>;

/** Fields a preset decides. Language and listenThenRead are personal, so a preset leaves them alone. */
const PRESET_FIELDS = [
  'audioInstructions',
  'questionReadAloud',
  'textSize',
  'lineSpacing',
  'readingRuler',
  'simpleWords',
] as const satisfies readonly (keyof ReadingHelpSettings)[];

/** Apply a preset on top of the current settings. */
export function applyPreset(
  current: ReadingHelpState,
  preset: PresetName,
  presets: Presets,
): ReadingHelpState {
  const values = presets[preset];
  const next = { ...current };
  for (const field of PRESET_FIELDS) Object.assign(next, { [field]: values[field] });
  return next;
}

/** The preset the settings match exactly, or null when the learner has mixed their own. */
export function matchingPreset(state: ReadingHelpState, presets: Presets): PresetName | null {
  for (const name of PRESET_NAMES) {
    const values = presets[name];
    if (PRESET_FIELDS.every((field) => state[field] === values[field])) return name;
  }
  return null;
}

/** The attributes put on <html>. packages/ui tokens.css reads them as CSS variables. */
export interface RootAttributes {
  'data-text-size': ReadingHelpState['textSize'];
  'data-line-spacing': ReadingHelpState['lineSpacing'];
  /** "more" turns high contrast on. Absent leaves it to the system setting. */
  'data-contrast': 'more' | null;
}

export function toRootAttributes(state: ReadingHelpState): RootAttributes {
  return {
    'data-text-size': state.textSize,
    'data-line-spacing': state.lineSpacing,
    'data-contrast': state.highContrast ? 'more' : null,
  };
}

export function applyToRoot(
  root: Pick<Element, 'setAttribute' | 'removeAttribute'>,
  state: ReadingHelpState,
): void {
  for (const [name, value] of Object.entries(toRootAttributes(state))) {
    if (value === null) root.removeAttribute(name);
    else root.setAttribute(name, value);
  }
}

/**
 * The accommodations switched on by reading help, for the answers they affect (golden rule 12).
 * The story and question screens (BB-32, BB-33) call this when they build an answer and
 * add what the learner actually used. Only question read-aloud comes from these settings.
 * `supported_try` and `word_tap` come from the try and the tap itself.
 */
export function activeAccommodations(state: ReadingHelpSettings): Accommodation[] {
  return state.questionReadAloud ? ['question_read_aloud'] : [];
}

// ---- per-device copy -------------------------------------------------------

export const STORAGE_PREFIX = 'bb.readingHelp.';

export function storageKey(learnerId: string): string {
  return `${STORAGE_PREFIX}${learnerId}`;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const ENUMS = {
  textSize: ['small', 'medium', 'large'],
  lineSpacing: ['normal', 'wide'],
  language: ['en', 'fil'],
} as const;
const FLAGS = [
  'audioInstructions',
  'questionReadAloud',
  'readingRuler',
  'simpleWords',
  'listenThenRead',
  'highContrast',
] as const;

/** Keep only known values from stored data. Missing fields take the defaults. */
function parseStored(data: unknown): ReadingHelpState | null {
  if (typeof data !== 'object' || data === null) return null;
  const input = data as Record<string, unknown>;
  const next: Record<string, unknown> = { ...DEFAULT_STATE };
  for (const [key, allowed] of Object.entries(ENUMS)) {
    if (input[key] === undefined) continue;
    if (!(allowed as readonly unknown[]).includes(input[key])) return null;
    next[key] = input[key];
  }
  for (const key of FLAGS) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'boolean') return null;
    next[key] = input[key];
  }
  return next as unknown as ReadingHelpState;
}

/** Read this learner's copy. Anything missing or damaged gives null, never a guess. */
export function loadState(storage: StorageLike, learnerId: string): ReadingHelpState | null {
  try {
    const raw = storage.getItem(storageKey(learnerId));
    return raw === null ? null : parseStored(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Returns false when the browser blocked the write. */
export function saveState(
  storage: StorageLike,
  learnerId: string,
  state: ReadingHelpState,
): boolean {
  try {
    storage.setItem(storageKey(learnerId), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
