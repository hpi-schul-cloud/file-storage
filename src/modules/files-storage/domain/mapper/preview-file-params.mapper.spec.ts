import { PreviewFileOptions } from '@infra/preview-generator';
import { PreviewFileParams, PreviewOutputMimeTypes } from '../../domain';
import { fileRecordTestFactory } from '../../testing';
import { PreviewFileOptionsMapper } from './preview-file-params.mapper';

describe('PreviewFileOptionsMapper', () => {
	describe('fromPreviewFileParams is called', () => {
		const setup = () => {
			const fileRecord = fileRecordTestFactory().build();
			const previewParams = { outputFormat: PreviewOutputMimeTypes.IMAGE_WEBP };
			const originFilePath = 'originFilePath';
			const previewFilePath = 'previewFilePath';
			const previewFileParams: PreviewFileParams = {
				fileRecord,
				previewParams,
				hash: 'hash',
				format: PreviewOutputMimeTypes.IMAGE_WEBP,
				bytesRange: 'bytes=0-100',
			};

			const expectedResponse: PreviewFileOptions = {
				originFilePath,
				previewFilePath,
				previewOptions: {
					format: previewFileParams.format,
					width: previewFileParams.previewParams.width,
				},
			};

			return { previewFileParams, expectedResponse, originFilePath, previewFilePath };
		};

		it('should return preview payload', () => {
			const { previewFileParams, expectedResponse, originFilePath, previewFilePath } = setup();

			const result = PreviewFileOptionsMapper.fromPreviewFileParams(previewFileParams, originFilePath, previewFilePath);

			expect(result).toEqual(expectedResponse);
		});
	});
});
