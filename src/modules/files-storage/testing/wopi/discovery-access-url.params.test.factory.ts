import { ObjectId } from '@mikro-orm/mongodb';
import type { DiscoveryAccessUrlParams } from '../../api/dto/wopi.params';
import { EditorMode } from '../../api/dto/wopi.params';

class DiscoveryAccessUrlParamsTestFactory {
	private readonly props: DiscoveryAccessUrlParams = {
		fileRecordId: new ObjectId().toHexString(),
		editorMode: EditorMode.EDIT,
		userDisplayName: 'Test User',
	};

	public build(params: Partial<DiscoveryAccessUrlParams> = {}): DiscoveryAccessUrlParams {
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

export const discoveryAccessUrlParamsTestFactory = (): DiscoveryAccessUrlParamsTestFactory =>
	new DiscoveryAccessUrlParamsTestFactory();
