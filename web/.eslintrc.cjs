module.exports = {
	root: true,
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'prettier'
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module',
		ecmaFeatures: {
			jsx: true
		}
	},
	env: {
		browser: true,
		es2020: true,
		node: true
	},
	rules: {
		'no-console': 'warn',
		'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		'@typescript-eslint/no-explicit-any': 'warn',
		'prefer-const': 'error',
		'no-var': 'error'
	},
	overrides: [
		{
			files: ['*.svelte'],
			parser: 'svelte-eslint-parser',
			parserOptions: {
				parser: '@typescript-eslint/parser'
			}
		}
	]
};
