import { generateNanoId } from '../testing/nanoid.test.factory';
import { AccessToken } from './access-token.vo';

describe('AccessToken', () => {
	describe('constructor', () => {
		describe('when token is valid', () => {
			const setup = () => {
				const token = generateNanoId();

				return {
					token,
				};
			};

			it('should create AccessToken with valid 24 chars alpha numeric token', () => {
				const { token } = setup();

				const result = new AccessToken({ token });

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

				expect(() => new AccessToken({ token })).toThrowError();
			});
		});
	});
});
