import { ObjectId } from '@mikro-orm/mongodb';
import { wopiAccessTokenTestFactory } from '../../testing';
import { AuthorizedCollaboraDocumentUrl } from '../vo/access-url.vo';
import { AuthorizedCollaboraDocumentUrlFactory } from './access-url.factory';

describe('AuthorizedCollaboraDocumentUrlFactory', () => {
	describe('build', () => {
		it('should build a valid AuthorizedCollaboraDocumentUrl', () => {
			const url =
				'https://editor.example.com/?WOPISrc=https%3A%2F%2Fwopi.example.com%2Fwopi%2F12345&access_token=testtoken';

			const result = AuthorizedCollaboraDocumentUrlFactory.build(url);

			expect(result).toBeInstanceOf(AuthorizedCollaboraDocumentUrl);
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

		it('should build a valid AuthorizedCollaboraDocumentUrl with correct params', () => {
			const { onlineEditorUrl, wopiSrc, fileRecordId, accessToken } = setup();

			const result = AuthorizedCollaboraDocumentUrlFactory.buildFromParams(
				onlineEditorUrl,
				wopiSrc,
				fileRecordId,
				accessToken
			);

			expect(result).toBeInstanceOf(AuthorizedCollaboraDocumentUrl);
			expect(result.url).toBe(
				`${onlineEditorUrl}/?WOPISrc=${encodeURIComponent(`${wopiSrc}/${fileRecordId}`)}&access_token=${accessToken.token}`
			);
		});
	});
});
