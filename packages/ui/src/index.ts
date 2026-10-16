/**
 * Shared UI package (BB-05). Components from the design canvas land here.
 * Import the styles once in the app root layout:
 *   import '@basabridge/ui/tokens.css';
 *   import '@basabridge/ui/components.css';
 * Components take every visible word as a prop, so the text comes from the i18n catalog.
 */
export * from './components/Button';
export * from './components/OptionCard';
export * from './components/Progress';
export * from './components/Surface';
export * from './components/Field';
export * from './components/Spinner';
export * from './components/Tabs';
export * from './components/ReadingSupport';
export { cx, VisuallyHidden } from './components/util';
export { contrastRatio } from './contrast';

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
