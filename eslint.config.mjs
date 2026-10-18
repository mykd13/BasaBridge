import js from '@eslint/js';
import i18next from 'eslint-plugin-i18next';
import tseslint from 'typescript-eslint';

/**
 * Pages and routes must not reach the database in any way (BB-10, AGENTS.md rule 4). The rule is
 * a ban on whole packages, not a list of table and helper names, so a new table, a new helper,
 * `createDbFromEnv`, `@basabridge/db/testing` and the database drivers are all covered.
 * The rule covers `src/app` only. Modules under `src/server` are trusted: they are reviewed as the
 * place where authorization happens, and must not be imported by client components.
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
    // Node scripts, for example the bundle budget check (BB-71).
    files: ['**/scripts/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
  },
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
  {
    // Golden rule 13: interface text comes from the i18n catalog (docs/i18n.md).
    // Native elements are checked for text, aria-label, title, placeholder, alt and value.
    // Other components are checked for every prop except the ones below.
    files: ['apps/web/src/**/*.tsx', 'packages/ui/src/**/*.tsx'],
    ignores: ['apps/web/src/app/dev/**', '**/*.test.tsx'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          message: 'Hard-coded interface text. Add it to the i18n catalog and use t()',
          'jsx-attributes': {
            exclude: [
              'className',
              'styleName',
              'style',
              'type',
              'key',
              'id',
              'name',
              'role',
              'lang',
              'href',
              'src',
              'width',
              'height',
              'variant',
              'size',
              'tone',
              'live',
              'screen',
              'boards',
              'data-testid',
              'htmlFor',
              'target',
              'rel',
              'aria-(?!label$).*',
              'fill',
              'stroke',
              'viewBox',
              'd',
            ],
          },
        },
      ],
    },
  },
);
