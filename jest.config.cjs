/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	extensionsToTreatAsEsm: ['.ts'],
	// Only transpile the `sanitize-html` dependency subtree, which pulls in pure ESM `.js`
	// packages (htmlparser2, entities, dom-serializer, domhandler). Everything else in
	// node_modules stays untouched so CJS singletons (e.g. reflect-metadata / class-transformer
	// decorator metadata) are not re-compiled and corrupted.
	transformIgnorePatterns: [
		'node_modules/(?!(sanitize-html|htmlparser2|entities|dom-serializer|domhandler|domutils|domelementtype)/)',
	],
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
		],
		// Transpile the whitelisted ESM `.js`/`.mjs` dependencies to CommonJS.
		'^.+\\.m?jsx?$': [
			'ts-jest',
			{
				isolatedModules: true,
				tsconfig: {
					allowJs: true,
				},
			},
		],
	},
	moduleFileExtensions: ['js', 'mjs', 'json', 'ts'],
	rootDir: 'src',
	testRegex: String.raw`.*\.spec\.ts$`,
	collectCoverageFrom: ['**/*.(t|j)s'],
	coverageDirectory: '../coverage',
	testEnvironment: 'node',
	moduleNameMapper: {
		// add ts-config path's here as regex
		'^@infra/(.*)$': '<rootDir>/infra/$1',
		'^@modules/(.*)$': '<rootDir>/modules/$1',
		'^@testing/(.*)$': '<rootDir>/testing/$1',
		'^@shared/(.*)$': '<rootDir>/shared/$1',
	},
	globalSetup: '<rootDir>/../scripts/testing/globalSetup.ts',
	globalTeardown: '<rootDir>/../scripts/testing/globalTeardown.ts',
};
