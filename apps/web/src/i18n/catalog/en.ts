import type { Catalog } from '../types.ts';

export const en = {
  app: {
    name: { standard: 'BasaBridge' },
    tagline: {
      standard: 'Read out loud. Understand more.',
      simple: 'Read out loud.',
      spoken: true,
      lowLevel: true,
    },
  },
  home: {
    levelOne: {
      standard: 'Level 1 stories are {min} to {max} words.',
    },
  },
  language: {
    label: { standard: 'Language', simple: 'Language' },
    en: { standard: 'English' },
    fil: { standard: 'Filipino' },
  },
} as const satisfies Catalog;
