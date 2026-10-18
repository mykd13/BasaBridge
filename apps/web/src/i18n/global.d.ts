import type { Messages } from './types.ts';
import type { en } from './catalog/en.ts';
import type { Lang } from './types.ts';

declare module 'next-intl' {
  interface AppConfig {
    Locale: Lang;
    Messages: Messages<typeof en>;
  }
}
