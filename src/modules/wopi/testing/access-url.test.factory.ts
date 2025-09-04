import { randomUUID } from 'node:crypto';
import { AuthorizedCollaboraDocumentUrl } from '../domain';

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
