module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    'react',
    'react-hooks',
    'jsx-a11y',
  ],
  rules: {
    // React関連のルール
    'react/react-in-jsx-scope': 'off', // React 17+では不要
    'react/prop-types': 'warn',
    'react/jsx-uses-react': 'off',
    'react/jsx-uses-vars': 'error',
    'react/jsx-key': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-undef': 'error',
    'react/no-array-index-key': 'warn',
    'react/no-unescaped-entities': 'warn',
    'react/self-closing-comp': 'warn',

    // React Hooks関連のルール
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // アクセシビリティ関連のルール
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/anchor-is-valid': 'error',
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/no-static-element-interactions': 'warn',

    // 一般的なルール
    'no-console': 'off',
    'no-debugger': 'off',
    'no-unused-vars': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    'react/no-array-index-key': 'off',
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    'comma-dangle': ['error', 'always-multiline'],
    'comma-spacing': 'error',
    'comma-style': 'error',
    'computed-property-spacing': 'error',
    'func-call-spacing': 'error',
    'key-spacing': 'error',
    'keyword-spacing': 'error',
    'object-curly-spacing': ['error', 'always'],
    'semi': ['error', 'always'],
    'semi-spacing': 'error',
    'space-before-blocks': 'error',
    'space-before-function-paren': 'off',
    'space-in-parens': 'error',
    'space-infix-ops': 'error',
    'space-unary-ops': 'error',
    'spaced-comment': 'error',
    'template-curly-spacing': 'error',

    // インデントとフォーマット
    'indent': ['error', 2, { SwitchCase: 1 }],
    'linebreak-style': 'off',
    'quotes': ['error', 'single', { avoidEscape: true }],
    'max-len': 'off',

    // その他のルール
    'eqeqeq': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unused-expressions': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-useless-return': 'error',
    'radix': 'error',
    'wrap-iife': 'error',
    'yoda': 'error',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.test.jsx', '**/*.spec.js', '**/*.spec.jsx'],
      env: {
        jest: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
    // TypeScript ファイル用の設定
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      rules: {
        // TypeScript コンパイラが処理するため無効化
        'no-undef': 'off',
        // TypeScript の prop-types は不要
        'react/prop-types': 'off',
        // インターフェース定義などの未使用変数警告を抑制
        'no-unused-vars': 'off',
        'indent': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'space-before-function-paren': 'off',
        'no-console': 'off'
      },
    },
  ],
};
