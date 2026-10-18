import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Pages and routes must not reach the database in any way (BB-10, AGENTS.md rule 4). The rule is
 * a ban on whole packages, not a list of table and helper names, so a new table, a new helper,
 * `createDbFromEnv`, `@basabridge/db/testing` and the database drivers are all covered.
 */
const DB_MODULES = [
  '@basabridge/db',
  '@basabridge/db/*',
  'drizzle-orm',
  'drizzle-orm/*',
  '@electric-sql/pglite',
  '@electric-sql/pglite/*',
  'pg',
  'pg/*',
  'postgres',
  'postgres/*',
];
// esquery ends a regex at the first slash, so each slash is written as the hex escape below.
const DB_MODULE_REGEX =
  '^(@basabridge\\x2fdb|drizzle-orm|@electric-sql\\x2fpglite|pg|postgres)(\\x2f.*)?$';
const NO_DB_MESSAGE =
  'Pages and routes do not touch the database. Read learner data through @/server/access (BB-10).';

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
          patterns: [{ group: DB_MODULES, message: NO_DB_MESSAGE, allowTypeImports: true }],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: `ImportExpression[source.value=/${DB_MODULE_REGEX}/]`,
          message: NO_DB_MESSAGE,
        },
        {
          selector: `CallExpression[callee.name='require'][arguments.0.value=/${DB_MODULE_REGEX}/]`,
          message: NO_DB_MESSAGE,
        },
      ],
    },
  },
);
