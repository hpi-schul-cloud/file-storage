import { randomUUID } from 'crypto';
import { WopiAccessToken } from './wopi-access-token.vo';

describe('WopiAccessToken', () => {
	describe('constructor', () => {
		describe('when token is valid', () => {
			const setup = () => {
				const token = randomUUID();

				return {
					token,
				};
			};

			it('should create WoipAccessToken with valid UUID token', () => {
				const { token } = setup();

				const result = new WopiAccessToken({ token });

				expect(result.token).toBe(token);
			});
		});

		describe('when token is invalid', () => {
			const setup = () => {
				const token = 'invalid-token';

				return {
					token,
				};
			};

			it('should throw an error', () => {
				const { token } = setup();

				expect(() => new WopiAccessToken({ token })).toThrowError();
			});
		});
	});
});
