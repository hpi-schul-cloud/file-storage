import { accessUrlTestFactory } from '@modules/files-storage/testing';
import { AccessUrlResponseFactory } from './access-url.response.factory';

describe('AccessUrlResponseFactory', () => {
	describe('build', () => {
		const setup = () => {
			const props = { onlineUrl: 'https://example.com/file' };

			return { props };
		};

		it('should return an AccessUrlResponse with the correct onlineUrl', () => {
			const { props } = setup();

			const result = AccessUrlResponseFactory.build(props);

			expect(result.onlineUrl).toBe(props.onlineUrl);
		});
	});

	describe('buildFromAccessUrl', () => {
		const setup = () => {
			const accessUrl = accessUrlTestFactory().build();

			return { accessUrl };
		};

		it('should return an AccessUrlResponse with the correct onlineUrl', () => {
			const { accessUrl } = setup();

			const result = AccessUrlResponseFactory.buildFromAccessUrl(accessUrl);

			expect(result.onlineUrl).toBe(accessUrl.url);
		});
	});
});
