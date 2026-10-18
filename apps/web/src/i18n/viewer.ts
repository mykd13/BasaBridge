import type { Viewer } from './resolve.ts';

/**
 * Who is looking at the page. Sign-in (BB-12) and getMyReadingHelp() (BB-59) do not exist yet,
 * so everyone is signed out and gets the browser language. When they land, return the
 * learner's ReadingHelp here and nothing else in i18n changes.
 */
export async function getViewer(): Promise<Viewer> {
  return { kind: 'signed-out' };
}
