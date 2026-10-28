import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  { ignores: ['node_modules/**', 'dist/**', 'output/**', 'docs/**', 'src-tauri/**'] },
  {
    ...js.configs.recommended,
    files: ['tests/**/*.js', '*.js'],
    languageOptions: { globals: globals.node },
  },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.ts', '*.ts'],
    languageOptions: { globals: globals.browser },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ['tests/e2e/**/*.ts', 'playwright.config.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
]
