import { ObjectId } from '@mikro-orm/mongodb';
import { wopiAccessTokenTestFactory } from '@modules/files-storage/testing';
import { AccessUrl } from '../access-url.vo';
import { AccessUrlFactory } from './access-url.factory';

describe('AccessUrlFactory', () => {
	describe('build', () => {
		it('should build a valid AccessUrl', () => {
			const url =
				'https://editor.example.com/?WOPISrc=https%3A%2F%2Fwopi.example.com%2Fwopi%2F12345&access_token=testtoken';

			const result = AccessUrlFactory.build(url);

			expect(result).toBeInstanceOf(AccessUrl);
			expect(result.url).toBe(url);
		});
	});

	describe('buildFromParams', () => {
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

			const result = AccessUrlFactory.buildFromParams(onlineEditorUrl, wopiSrc, fileRecordId, accessToken);

			expect(result).toBeInstanceOf(AccessUrl);
			expect(result.url).toBe(
				`${onlineEditorUrl}/?WOPISrc=${encodeURIComponent(`${wopiSrc}/${fileRecordId}`)}&access_token=${accessToken.token}`
			);
		});
	});
});
