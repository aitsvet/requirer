import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'script',
            globals: globals.browser,
        },
        rules: {
            'no-unused-vars': 'error',
            'no-undef': 'error',
            'eqeqeq': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'no-console': 'off',
        },
    },
];
