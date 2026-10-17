import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/** Learner tables and the helpers that read or write them without an access check (BB-10). */
const LEARNER_DATA = [
  'users',
  'learners',
  'parentLinks',
  'linkCodes',
  'guardianApprovals',
  'consents',
  'readingSessions',
  'tries',
  'answers',
  'decisions',
  'audioObjects',
  'placementSessions',
  'abilityEstimates',
  'lessonProgress',
  'learnerSettings',
  'getUserById',
  'getUserByUsername',
  'deleteUser',
  'createLearner',
  'getLearner',
  'createReadingSession',
  'getReadingSession',
  'insertTry',
  'insertAnswer',
  'getParentLink',
];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      'design/**',
      'next-env.d.ts',
      '**/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Pages and routes read learner data only through the authorization layer (BB-10,
    // AGENTS.md rule 4): apps/web/src/server/access. They never touch learner tables directly.
    files: ['apps/web/src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@basabridge/db',
              importNames: LEARNER_DATA,
              message: 'Read learner data through @/server/access (BB-10).',
            },
            {
              name: '@basabridge/db/schema',
              message: 'Pages and routes do not use tables. Use @/server/access (BB-10).',
            },
            {
              name: 'drizzle-orm',
              message: 'Pages and routes do not query the database. Use @/server/access (BB-10).',
            },
          ],
        },
      ],
    },
  },
);
