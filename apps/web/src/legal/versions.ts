/**
 * Versions and files of the legal documents (BB-69). Server only: it reads the files.
 *
 * Consent text is a locked area (Rhett and James). The consent flow stores one of these numbers
 * with each agreement and asks again when the stored number is lower than the current one
 * (`requireCurrentConsent` in `server/consent.ts`). Versions are whole numbers because the
 * `consents.version` column is an integer.
 *
 * Bump a version in the same pull request that changes the text of its document. A test hashes
 * the files and fails if the text changed and the version did not (see `content-hashes.json`).
 * The first text that qualified counsel signs off must be a higher number than the draft, so
 * that everyone who agreed to a draft is asked again.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Lang } from '@/i18n/types';

export const LEGAL_VERSIONS = {
  privacy: 1,
  terms: 1,
  kidsSummary: 1,
} as const;

export type LegalKind = keyof typeof LEGAL_VERSIONS;

export const LEGAL_KINDS = Object.keys(LEGAL_VERSIONS) as LegalKind[];

/**
 * Every document is a placeholder until someone qualified in the Philippine Data Privacy Act
 * has reviewed it. Pages say so on screen. Change this only after that review (BB-69 handoff).
 */
export const LEGAL_REVIEW_STATUS = 'awaiting qualified review' as const;

export interface LegalDoc {
  kind: LegalKind;
  lang: Lang;
  version: number;
  /** Markdown in the small subset `markdown.ts` reads. */
  source: string;
}

/** The file for each document. The kids summary is only written in simple wording. */
export function legalFileName(kind: LegalKind, lang: Lang): string {
  return kind === 'kidsSummary' ? `kids.${lang}.simple.md` : `${kind}.${lang}.md`;
}

const cache = new Map<string, string>();

/** `src/legal` of this app. Next and Vitest both run with apps/web as the working directory. */
export function legalDir(): string {
  return join(process.cwd(), 'src', 'legal');
}

export function getLegalDoc(kind: LegalKind, lang: Lang): LegalDoc {
  const file = legalFileName(kind, lang);
  let source = cache.get(file);
  if (source === undefined) {
    source = readFileSync(join(legalDir(), file), 'utf8');
    cache.set(file, source);
  }
  return { kind, lang, version: LEGAL_VERSIONS[kind], source };
}
