module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  ignorePatterns: ['!.prettierrc.js'],
  plugins: ['@typescript-eslint', 'unused-imports'],
  extends: [
    'eslint:recommended',
    'next',
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'react/no-unescaped-entities': 'off',

    'react/display-name': 'off',
    'react/jsx-curly-brace-presence': [
      'warn',
      { props: 'never', children: 'never' },
    ],

    '@typescript-eslint/no-unused-vars': 'warn',
    'unused-imports/no-unused-imports': 'warn',
    'no-empty': ['error', { allowEmptyCatch: true }],
  },
  globals: {
    React: true,
    JSX: true,
  },
};
