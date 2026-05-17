import js from '@eslint/js';
import globals from 'globals';

const baseRules = {
    'no-unused-vars': 'error',
    'no-undef': 'error',
    'eqeqeq': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'no-console': 'off',
};

export default [
    { ignores: ['node_modules/', 'eslint.config.js'] },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'script',
            globals: globals.browser,
        },
        rules: baseRules,
    },
    {
        files: ['tests/**', 'playwright.config.js'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                test: 'readonly',
                expect: 'readonly',
            },
        },
        rules: baseRules,
    },
];
