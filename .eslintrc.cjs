module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 'latest',
    parser: '@typescript-eslint/parser',
    sourceType: 'module'
  },
  plugins: ['vue', '@typescript-eslint'],
  globals: {
    $: 'readonly',
    jQuery: 'readonly',
    ZeroCodeCommon: 'readonly'
  },
  ignorePatterns: ['public/js/*.js', 'examples/**/vendor/**', 'examples/**/public/js/**'],
  rules: {
    'vue/multi-word-component-names': 'off',
    'vue/no-reserved-component-names': 'off',
    'vue/no-mutating-props': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_'
      }
    ],
    'no-console': ['warn', { allow: ['warn', 'error', 'debug'] }],
    '@typescript-eslint/no-var-requires': 'off',
    'no-useless-escape': 'off'
  },
  overrides: [
    {
      // テストでは、テスト用の小さなコンポーネントを1ファイルに複数定義する
      files: ['**/*.test.ts'],
      rules: {
        'vue/one-component-per-file': 'off'
      }
    },
    {
      // Node で動かすスクリプトとデモのサーバーは、標準出力に結果を出す
      files: ['scripts/**', 'examples/**/*.js', 'examples/**/*.mjs'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
};
