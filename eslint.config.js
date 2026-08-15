import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'coverage/**',
      '**/*.config.js',
      '**/*.config.ts',
      'vitest.workspace.ts',
      'benchmark/tmp-prisma-examples/**',
      'benchmark/repositories/**',
      'benchmark/fixtures/**',
      'apps/frontend/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-optional-chaining': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      'prefer-const': 'off',
      'no-undef': 'off',
      'no-async-promise-executor': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
);
