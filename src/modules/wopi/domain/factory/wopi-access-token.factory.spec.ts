import { generateNanoId } from '@testing/factory/nanoid.factory';
import { WopiAccessTokenFactory } from './wopi-access-token.factory';

describe('WopiAccessTokenFactory', () => {
	describe('build', () => {
		it('should create a WopiAccessToken with the provided token', () => {
			const token = generateNanoId();

			const result = WopiAccessTokenFactory.build({ token });

			expect(result.token).toBe(token);
		});
	});

	describe('buildFromString', () => {
		it('should create a WopiAccessToken from a string token', () => {
			const token = generateNanoId();

			const result = WopiAccessTokenFactory.buildFromString(token);

			expect(result.token).toBe(token);
		});
	});
});
