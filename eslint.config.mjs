import js from '@eslint/js';
import i18next from 'eslint-plugin-i18next';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.next-parent/**',
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
