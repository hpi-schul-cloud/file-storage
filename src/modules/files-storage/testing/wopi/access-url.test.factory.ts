import { AccessUrl } from '@modules/files-storage/domain/access-url.vo';
import { randomUUID } from 'node:crypto';

class AccessUrlTestFactory {
	private readonly props: AccessUrl = {
		url: `https://example.com?WOPISrc=https://example.com&access_token=${randomUUID()}`,
	};

	public build(params: Partial<AccessUrl> = {}): AccessUrl {
		return { ...this.props, ...params };
	}
}

export const accessUrlTestFactory = (): AccessUrlTestFactory => new AccessUrlTestFactory();
