import {
  READING_HELP_PRESETS,
  ReadingHelp,
  type Accommodation,
  type ReadingHelp as ReadingHelpSettings,
} from '@basabridge/contracts';

/**
 * What the screen edits: the contract's ReadingHelp plus one per-device field.
 * `highContrast` is not in the contract yet (see the BB-59 PR), so it is kept in this
 * browser only and never sent to the server.
 */
export type ReadingHelpState = ReadingHelpSettings & { highContrast: boolean };

export const DEFAULT_STATE: ReadingHelpState = {
  ...READING_HELP_PRESETS.standard,
  highContrast: false,
};

export type PresetName = keyof typeof READING_HELP_PRESETS;
export const PRESET_NAMES = ['standard', 'more'] as const satisfies readonly PresetName[];

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
export function applyPreset(current: ReadingHelpState, preset: PresetName): ReadingHelpState {
  const values = READING_HELP_PRESETS[preset];
  const next = { ...current };
  for (const field of PRESET_FIELDS) Object.assign(next, { [field]: values[field] });
  return next;
}

/** The preset the settings match exactly, or null when the learner has mixed their own. */
export function matchingPreset(state: ReadingHelpState): PresetName | null {
  for (const name of PRESET_NAMES) {
    const values = READING_HELP_PRESETS[name];
    if (PRESET_FIELDS.every((field) => state[field] === values[field])) return name;
  }
  return null;
}

/** The part the server will keep: the contract shape, without the device-only fields. */
export function toSharedSettings(state: ReadingHelpState): ReadingHelpSettings {
  return ReadingHelp.parse(state);
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

/** Read this learner's copy. Anything missing or damaged gives null, never a guess. */
export function loadState(storage: StorageLike, learnerId: string): ReadingHelpState | null {
  try {
    const raw = storage.getItem(storageKey(learnerId));
    if (raw === null) return null;
    const data: unknown = JSON.parse(raw);
    const parsed = ReadingHelp.safeParse(data);
    if (!parsed.success) return null;
    const highContrast =
      typeof data === 'object' &&
      data !== null &&
      (data as { highContrast?: unknown }).highContrast === true;
    return { ...parsed.data, highContrast };
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
