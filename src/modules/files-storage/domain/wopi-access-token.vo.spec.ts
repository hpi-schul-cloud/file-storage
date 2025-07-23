import { randomUUID } from 'crypto';
import { WoipAccessToken } from './wopi-access-token.vo';

describe('WoipAccessToken', () => {
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

				const result = new WoipAccessToken(token);

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

				expect(() => new WoipAccessToken(token)).toThrowError();
			});
		});
	});
});
