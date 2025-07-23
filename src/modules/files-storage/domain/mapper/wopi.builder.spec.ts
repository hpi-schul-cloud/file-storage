import { ObjectId } from '@mikro-orm/mongodb';
import { randomUUID } from 'crypto';
import { wopiAccessTokenTestFactory } from '../../testing/wopi';
import { AccessUrl } from '../access-url.vo';
import { WopiAccessToken } from '../wopi-access-token.vo';
import { WopiPayload } from '../wopi-payload.vo';
import { WopiBuilder } from './wopi.builder';

afterEach(() => {
	jest.resetAllMocks();
});

describe('WopiBuilder', () => {
	describe('buildAccessToken', () => {
		describe('when buildAccessToken resolves', () => {
			const setup = () => {
				const token = randomUUID();

				return {
					token,
				};
			};

			it('should build a valid WopiAccessToken with correct token', () => {
				const { token } = setup();

				const result = WopiBuilder.buildAccessToken(token);

				expect(result).toBeInstanceOf(WopiAccessToken);
				expect(result.token).toBe(token);
			});
		});
	});

	describe('buildWopiPayloadFromResponse', () => {
		const setup = () => {
			const fileRecordId = new ObjectId().toHexString();
			const canWrite = true;
			const userDisplayName = 'Test User';
			const userId = new ObjectId().toHexString();

			return {
				fileRecordId,
				canWrite,
				userDisplayName,
				userId,
			};
		};

		it('should build a valid WopiPayload from response props', () => {
			const { fileRecordId, canWrite, userDisplayName, userId } = setup();

			const responseProps = { fileRecordId, canWrite, userDisplayName, userId };

			const result = WopiBuilder.buildWopiPayloadFromResponse(responseProps);

			expect(result).toBeInstanceOf(WopiPayload);
			expect(result.fileRecordId).toBe(fileRecordId);
			expect(result.canWrite).toBe(canWrite);
			expect(result.userDisplayName).toBe(userDisplayName);
			expect(result.userId).toBe(userId);
		});
	});
});

describe('WopiBuilder', () => {
	describe('buildWopiPayload', () => {
		const setup = () => {
			const fileRecordId = new ObjectId().toHexString();
			const canWrite = true;
			const userDisplayName = 'Test User';
			const userId = new ObjectId().toHexString();

			return {
				fileRecordId,
				canWrite,
				userDisplayName,
				userId,
			};
		};

		it('should build a valid WopiPayload with correct props', () => {
			const { fileRecordId, canWrite, userDisplayName, userId } = setup();

			const result = WopiBuilder.buildWopiPayload(fileRecordId, canWrite, userDisplayName, userId);

			expect(result).toBeInstanceOf(WopiPayload);
			expect(result.fileRecordId).toBe(fileRecordId);
			expect(result.canWrite).toBe(canWrite);
			expect(result.userDisplayName).toBe(userDisplayName);
			expect(result.userId).toBe(userId);
		});
	});
});

describe('WopiBuilder', () => {
	describe('buildAccessUrl', () => {
		const setup = () => {
			const onlineEditorUrl = 'https://editor.example.com';
			const wopiSrc = 'https://wopi.example.com/wopi';
			const fileRecordId = new ObjectId().toHexString();
			const accessToken = wopiAccessTokenTestFactory().build();

			return {
				onlineEditorUrl,
				wopiSrc,
				fileRecordId,
				accessToken,
			};
		};

		it('should build a valid AccessUrl with correct params', () => {
			const { onlineEditorUrl, wopiSrc, fileRecordId, accessToken } = setup();

			const result = WopiBuilder.buildAccessUrl(onlineEditorUrl, wopiSrc, fileRecordId, accessToken);

			expect(result).toBeInstanceOf(AccessUrl);
			expect(result.url).toBe(
				`${onlineEditorUrl}/?WOPISrc=${encodeURIComponent(`${wopiSrc}/${fileRecordId}`)}&access_token=${accessToken.token}`
			);
		});
	});
});
