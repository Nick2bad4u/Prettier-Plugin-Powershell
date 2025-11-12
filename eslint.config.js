import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettierConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'warn',
    },
  },
  // Disallow direct prettier.format usage in tests to enforce using formatAndAssert helper
  {
    files: ['tests/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.type='MemberExpression'][callee.object.name='prettier'][callee.property.name='format']",
          message: 'Use the tests/utils/format-and-assert helper instead of calling prettier.format directly in tests.',
        },
      ],
    },
  },
  {
    files: ['tests/utils/format-and-assert.ts', 'tests/utils/no-prettier-format.test.ts'],
    rules: {
      // Allow direct prettier.format usage inside the helper and the enforcement test itself
      'no-restricted-syntax': 'off',
    },
  },
  // Disable typed TypeScript rules that require type information for scripts
  {
    files: ['scripts/**/*.js', 'scripts/**/*.mjs'],
    rules: {
      '@typescript-eslint/await-thenable': 'off',
    },
  },
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'scripts/**', '*.config.*', '**/*.mjs', '**/*.cjs'],
  }
);
