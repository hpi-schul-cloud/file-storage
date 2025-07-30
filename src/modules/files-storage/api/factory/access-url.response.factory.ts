import { AuthorizedCollaboraDocumentUrl } from '@modules/files-storage/domain/access-url.vo';
import { AuthorizedCollaboraDocumentUrlResponse } from '../dto/authorized-collabora-document-url.response';

export class AuthorizedCollaboraDocumentUrlResponseFactory {
	public static build(props: AuthorizedCollaboraDocumentUrlResponse): AuthorizedCollaboraDocumentUrlResponse {
		return new AuthorizedCollaboraDocumentUrlResponse(props);
	}

	public static buildFromAuthorizedCollaboraDocumentUrl(
		authorizedCollaboraDocumentUrl: AuthorizedCollaboraDocumentUrl
	): AuthorizedCollaboraDocumentUrlResponse {
		return new AuthorizedCollaboraDocumentUrlResponse({
			authorizedCollaboraDocumentUrl: authorizedCollaboraDocumentUrl.url,
		});
	}
}
