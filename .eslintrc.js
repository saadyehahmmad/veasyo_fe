module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    // Use the actual config files that include source files
    // tsconfig.json only has references, not actual file includes
    project: ['./tsconfig.app.json', './tsconfig.spec.json'],
    tsconfigRootDir: __dirname,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],

  plugins: ['@typescript-eslint', 'sonarjs'],

  rules: {
    //
    // Duplication & DRY Guards
    //
    'no-duplicate-imports': 'error',
    // Allow console in logger service (it's the logger implementation)
    'no-console': ['warn', { allow: ['error', 'warn', 'info', 'debug', 'log'] }],
    'no-dupe-keys': 'error',
    'no-dupe-class-members': 'error',
    'no-redeclare': 'off',
    '@typescript-eslint/no-redeclare': 'error',
    'no-useless-rename': 'error',
    'no-useless-constructor': 'off',
    '@typescript-eslint/no-useless-constructor': 'error',

    //
    // SonarJS Structural Analysis
    //
    'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
    'sonarjs/no-identical-functions': 'error',
    'sonarjs/no-identical-expressions': 'error',
    'sonarjs/no-duplicated-branches': 'error',
    'sonarjs/no-redundant-jump': 'error',
    'sonarjs/no-useless-catch': 'error',
    'sonarjs/prefer-immediate-return': 'warn',
    'sonarjs/prefer-object-literal': 'warn',
    'sonarjs/prefer-single-boolean-return': 'warn',
    'sonarjs/no-collapsible-if': 'warn',
    'sonarjs/no-redundant-boolean': 'warn',
    'sonarjs/no-small-switch': 'warn',



    //
    // TypeScript Best Practices
    //
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',

    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],

    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/no-inferrable-types': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',

  },

  env: {
    node: true,
    es2020: true,
  },
  // Ignore config files and build outputs
  ignorePatterns: ['node_modules/', 'dist/', '.eslintrc.js', 'public/assets/**/*.ts'],
  // Override rules for specific files

};
