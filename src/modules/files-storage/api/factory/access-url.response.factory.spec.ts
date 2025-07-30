import { authorizedCollaboraDocumentUrlTestFactory } from '@modules/files-storage/testing';
import { AuthorizedCollaboraDocumentUrlResponseFactory } from './access-url.response.factory';

describe('AuthorizedCollaboraDocumentUrlResponseFactory', () => {
	describe('build', () => {
		const setup = () => {
			const props = { authorizedCollaboraDocumentUrl: 'https://example.com/file' };

			return { props };
		};

		it('should return an AuthorizedCollaboraDocumentUrlResponse with the correct onlineUrl', () => {
			const { props } = setup();

			const result = AuthorizedCollaboraDocumentUrlResponseFactory.build(props);

			expect(result.authorizedCollaboraDocumentUrl).toBe(props.authorizedCollaboraDocumentUrl);
		});
	});

	describe('buildFromAuthorizedCollaboraDocumentUrl', () => {
		const setup = () => {
			const url = authorizedCollaboraDocumentUrlTestFactory().build();

			return { url };
		};

		it('should return an AuthorizedCollaboraDocumentUrlResponse with the correct onlineUrl', () => {
			const { url } = setup();

			const result = AuthorizedCollaboraDocumentUrlResponseFactory.buildFromAuthorizedCollaboraDocumentUrl(url);

			expect(result.authorizedCollaboraDocumentUrl).toBe(url.url);
		});
	});
});
