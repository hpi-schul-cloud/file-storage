import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptEslintEslintPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import checkFile from 'eslint-plugin-check-file';
import jest from 'eslint-plugin-jest';
import noOnlyTests from 'eslint-plugin-no-only-tests';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});

export default [
	{
		ignores: ['**/eslint.config.mjs', '**/ansible', '**/.github'],
	},
	...compat.extends('plugin:@typescript-eslint/stylistic-type-checked', 'plugin:prettier/recommended'),
	{
		plugins: {
			'@typescript-eslint': typescriptEslintEslintPlugin,
			'check-file': checkFile,
			jest,
			'no-only-tests': noOnlyTests,
		},

		languageOptions: {
			globals: {
				...globals.node,
				...globals.jest,
			},

			parser: tsParser,
			ecmaVersion: 5,
			sourceType: 'module',

			parserOptions: {
				project: 'tsconfig.json',
				tsconfigRootDir: import.meta.dirname,
			},
		},

		rules: {
			'newline-before-return': 'error',
			'require-await': 'error',
			'no-return-assign': 'error',
			'max-classes-per-file': 'error',
			'no-console': 'error',
			'@typescript-eslint/explicit-member-accessibility': [
				'error',
				{
					accessibility: 'explicit',
					overrides: {
						accessors: 'no-public',
						constructors: 'no-public',
						methods: 'explicit',
						properties: 'explicit',
						parameterProperties: 'explicit',
					},
				},
			],
			'@typescript-eslint/explicit-function-return-type': 'error',
			'@typescript-eslint/explicit-module-boundary-types': 'error',
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/unbound-method': 'error',
			'@typescript-eslint/no-unused-vars': 'error',
			'@typescript-eslint/no-non-null-assertion': 'error',
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'interface',
					format: ['PascalCase'],

					custom: {
						regex: '^I[A-Z]',
						match: false,
					},
				},
			],

			'@typescript-eslint/no-empty-interface': [
				'error',
				{
					allowSingleExtends: true,
				},
			],
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{ prefer: 'type-imports', fixStyle: 'inline-type-imports' },
			],
			'check-file/filename-naming-convention': [
				'error',
				{ '**/*.ts': 'KEBAB_CASE' },
				{ ignoreMiddleExtensions: true },
			],
			'no-only-tests/no-only-tests': 'error',
		},
	},
	{
		files: ['**/*spec.ts'],

		plugins: {
			jest,
			'no-only-tests': noOnlyTests,
		},

		languageOptions: {
			globals: {
				...globals.jest,
			},
		},

		rules: {
			'@typescript-eslint/unbound-method': 'off',
			'jest/unbound-method': 'error',
			'jest/prefer-spy-on': 'error',
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-member-accessibility': 'off',
			'max-classes-per-file': 'off',
		},
	},
	{
		files: ['**/*.entity.ts', '**/*.embeddable.ts', '**/*.config.ts', '**/dto/*.ts', '**/testing/*.ts'],
		rules: {
			'@typescript-eslint/explicit-member-accessibility': [
				'error',
				{
					accessibility: 'explicit',
					overrides: {
						accessors: 'no-public',
						constructors: 'no-public',
						methods: 'explicit',
						properties: 'no-public',
						parameterProperties: 'explicit',
					},
				},
			],
		},
	},
	{
		files: [
			'src/**/*.repo.ts',
			'src/**/*.service.ts',
			'src/**/*.controller.ts',
			'src/**/*.uc.ts',
			'!src/**/dto/*.ts'
		],
		rules: {
			'max-classes-per-file': ['error', 2],
		},
	},
	{
		files: ['**/*.dto.ts', '**/*.params.ts', '**/*.response.ts'],
		rules: {
			'@typescript-eslint/explicit-member-accessibility': [
				'error',
				{
					accessibility: 'no-public',
					overrides: {
						accessors: 'no-public',
						constructors: 'no-public',
						methods: 'no-public',
						properties: 'no-public',
						parameterProperties: 'no-public',
					},
				},
			],
			'no-restricted-syntax': [
				'error',
				{
					selector: 'MethodDefinition[kind="method"]',
					message: 'Methods are not allowed in DTOs. DTOs should only be data holders.',
				},
			],
		},
	},
	{
		files: ['src/infra/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['@modules/**'],
							message: 'Imports from @modules are not allowed in infra.',
						},
					],
				},
			],
		},
	},
	{
		files: ['src/modules/**'],
		rules: {
			'no-restricted-imports': [
				'warn',
				{
					patterns: [
						{
							group: ['@modules/*/*', '!@modules/*/testing'],
							message: 'Do not deep import from a module. Import from the module index instead.',
						},
					],
				},
			],
		},
	},
];
