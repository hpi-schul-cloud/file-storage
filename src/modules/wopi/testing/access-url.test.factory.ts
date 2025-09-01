import { AuthorizedCollaboraDocumentUrl } from '@modules/wopi/domain/vo/access-url.vo';
import { randomUUID } from 'node:crypto';

class AuthorizedCollaboraDocumentUrlTestFactory {
	private readonly props: AuthorizedCollaboraDocumentUrl = {
		url: `https://example.com?WOPISrc=https://example.com&access_token=${randomUUID()}`,
	};

	public build(params: Partial<AuthorizedCollaboraDocumentUrl> = {}): AuthorizedCollaboraDocumentUrl {
		return { ...this.props, ...params };
	}
}

export const authorizedCollaboraDocumentUrlTestFactory = (): AuthorizedCollaboraDocumentUrlTestFactory =>
	new AuthorizedCollaboraDocumentUrlTestFactory();
