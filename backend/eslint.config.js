const security = require('eslint-plugin-security');
const noSecrets = require('eslint-plugin-no-secrets');

module.exports = [
  {
    ignores: ['node_modules/**', 'tests/**', 'coverage/**'],
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
    },
    plugins: {
      security,
      'no-secrets': noSecrets,
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-pseudoRandomBytes': 'warn',
      'no-secrets/no-secrets': ['error', { tolerance: 3.5 }],
    },
  },
];
