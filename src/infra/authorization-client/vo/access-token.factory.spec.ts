import { generateNanoId } from '@testing/factory/nanoid.factory';
import { AccessTokenFactory } from './access-token.factory';

describe('AccessTokenFactory', () => {
	describe('build', () => {
		it('should create a WopiAccessToken with the provided token', () => {
			const token = generateNanoId();

			const result = AccessTokenFactory.build({ token });

			expect(result.token).toBe(token);
		});
	});

	describe('buildFromString', () => {
		it('should create a WopiAccessToken from a string token', () => {
			const token = generateNanoId();

			const result = AccessTokenFactory.buildFromString(token);

			expect(result.token).toBe(token);
		});
	});
});
