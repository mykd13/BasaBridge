export const LANGS = ['en', 'fil'] as const;
export type Lang = (typeof LANGS)[number];

export const WORDINGS = ['simple', 'standard'] as const;
export type Wording = (typeof WORDINGS)[number];

export const DEFAULT_LANG: Lang = 'en';

/** One interface message. `standard` is required, `simple` falls back to it. */
export interface Entry {
  standard: string;
  /** Shorter, plainer wording (docs/i18n.md). */
  simple?: string;
  /** Fixed sentence that gets pre-generated audio (BB-57). No placeholders allowed. */
  spoken?: boolean;
  /** Shown at levels 1 to 30, so the simple wording must be 8 words or fewer. */
  lowLevel?: boolean;
  /** A native speaker has checked this Filipino wording. */
  reviewed?: boolean;
}

/** A catalog is a tree whose leaves are entries. Branches never use the key "standard". */
export interface Catalog {
  [key: string]: Entry | Catalog;
}

/** The message tree next-intl reads: same shape, leaves are strings. */
export type Messages<T> = { [K in keyof T]: T[K] extends Entry ? string : Messages<T[K]> };

/** Compile-time check that another catalog has exactly the same keys. */
export type SameShape<T> = {
  [K in keyof T]: T[K] extends Entry ? Entry : SameShape<T[K]>;
};
