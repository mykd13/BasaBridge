/**
 * Shared UI package (BB-05). Components from the design canvas land here.
 * Import the tokens once in the app: `import '@basabridge/ui/tokens.css'`.
 */
export const TOKEN_NAMES = [
  'bg',
  'surface',
  'ink',
  'muted',
  'line',
  'line-strong',
  'accent',
  'accent-ink',
  'accent-soft',
  'mark',
  'mark-ink',
  'mark-soft',
  'good',
  'good-soft',
  'bad',
  'bad-soft',
  'warn',
] as const;

export type TokenName = (typeof TOKEN_NAMES)[number];

/** Read a token as a CSS variable reference, e.g. token('accent') -> 'var(--accent)'. */
export function token(name: TokenName): string {
  return `var(--${name})`;
}
