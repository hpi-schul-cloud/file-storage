import { randomUUID } from 'crypto';
import { WopiAccessTokenFactory } from './wopi-access-token.factory';

describe('WopiAccessTokenFactory', () => {
	describe('build', () => {
		it('should create a WopiAccessToken with the provided token', () => {
			const token = randomUUID();

			const result = WopiAccessTokenFactory.build({ token });

			expect(result.token).toBe(token);
		});
	});

	describe('buildFromString', () => {
		it('should create a WopiAccessToken from a string token', () => {
			const token = randomUUID();

			const result = WopiAccessTokenFactory.buildFromString(token);

			expect(result.token).toBe(token);
		});
	});
});
