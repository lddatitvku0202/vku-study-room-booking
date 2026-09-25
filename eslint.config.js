// https://docs.expo.dev/guides/using-eslint/
//
// Base config is eslint-config-expo, which already registers the
// @typescript-eslint, import, react and react-hooks plugins.
// The overrides below make the CLAUDE.md §11 TypeScript rules
// mechanically enforced rather than a convention.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // CLAUDE.md §11: no `any`.
      '@typescript-eslint/no-explicit-any': 'error',

      // CLAUDE.md §11: no @ts-ignore / @ts-nocheck.
      // @ts-expect-error is allowed only with an explanatory description.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
        },
      ],

      // Unused imports and variables are errors. `_`-prefixed names are opt-out.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      // Hook correctness is a defect class in this project (listeners,
      // subscriptions, query effects) — violations are errors, not warnings.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      // Deterministic import order keeps diffs small across features.
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-duplicates': 'error',
    },
  },
]);
