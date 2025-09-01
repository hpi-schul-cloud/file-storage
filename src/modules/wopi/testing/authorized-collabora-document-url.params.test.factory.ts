import { ObjectId } from '@mikro-orm/mongodb';
import type { AuthorizedCollaboraDocumentUrlParams } from '../api/dto/wopi.params';
import { EditorMode } from '../api/dto/wopi.params';

class AuthorizedCollaboraDocumentUrlParamsTestFactory {
	private readonly props: AuthorizedCollaboraDocumentUrlParams = {
		fileRecordId: new ObjectId().toHexString(),
		editorMode: EditorMode.EDIT,
		userDisplayName: 'Test User',
	};

	public build(params: Partial<AuthorizedCollaboraDocumentUrlParams> = {}): AuthorizedCollaboraDocumentUrlParams {
		return { ...this.props, ...params };
	}

	public withFileRecordId(fileRecordId: string): this {
		this.props.fileRecordId = fileRecordId;

		return this;
	}

	public withEditorMode(editorMode: EditorMode): this {
		this.props.editorMode = editorMode;

		return this;
	}

	public withUserDisplayName(userDisplayName: string): this {
		this.props.userDisplayName = userDisplayName;

		return this;
	}
}

export const authorizedCollaboraDocumentUrlParamsTestFactory = (): AuthorizedCollaboraDocumentUrlParamsTestFactory =>
	new AuthorizedCollaboraDocumentUrlParamsTestFactory();
