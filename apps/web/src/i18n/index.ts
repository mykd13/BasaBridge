import { en, type MessageKey } from './en';

export type { MessageKey };

/** Look up a message. `{name}` placeholders are filled from `vars`. BB-58 adds locale and wording. */
export function t(key: MessageKey, vars?: Record<string, string>): string {
  const text: string = en[key];
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match);
}
