import { generateNanoId } from '@infra/authorization-client/testing';
import { AuthorizedCollaboraDocumentUrl } from '../domain';

class AuthorizedCollaboraDocumentUrlTestFactory {
	private readonly props: AuthorizedCollaboraDocumentUrl = {
		url: `https://example.com?WOPISrc=https://example.com&access_token=${generateNanoId()}`,
	};

	public build(params: Partial<AuthorizedCollaboraDocumentUrl> = {}): AuthorizedCollaboraDocumentUrl {
		return { ...this.props, ...params };
	}
}

export const authorizedCollaboraDocumentUrlTestFactory = (): AuthorizedCollaboraDocumentUrlTestFactory =>
	new AuthorizedCollaboraDocumentUrlTestFactory();
