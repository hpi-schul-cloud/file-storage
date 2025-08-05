import { EntityId } from '@shared/domain/types';
import { AuthorizedCollaboraDocumentUrl } from '../access-url.vo';
import { WopiAccessToken } from '../vo';

export class AuthorizedCollaboraDocumentUrlFactory {
	public static build(url: string): AuthorizedCollaboraDocumentUrl {
		return new AuthorizedCollaboraDocumentUrl(url);
	}

	public static buildFromParams(
		collaboraDomain: string,
		wopiSrc: string,
		fileRecordId: EntityId,
		accessToken: WopiAccessToken
	): AuthorizedCollaboraDocumentUrl {
		const domain = new URL(collaboraDomain);
		domain.searchParams.set('WOPISrc', `${wopiSrc}/${fileRecordId}`);
		domain.searchParams.set('access_token', accessToken.token);

		const url = this.build(domain.toString());

		return url;
	}
}
