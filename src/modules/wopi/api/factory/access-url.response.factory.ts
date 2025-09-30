import { AuthorizedCollaboraDocumentUrl } from '../../domain';
import { AuthorizedCollaboraDocumentUrlResponse } from '../dto';

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
