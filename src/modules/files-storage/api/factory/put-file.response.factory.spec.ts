import { fileRecordTestFactory } from '@modules/files-storage/testing';
import { PutFileResponse } from '../dto/put-file.response';
import { PutFileResponseFactory } from './put-file.response.factory';

describe('PutFileResponseFactory', () => {
	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('build', () => {
		const setup = () => {
			const props: PutFileResponse = { LastModifiedTime: '2025-07-25T12:00:00.000Z' };
			const result = PutFileResponseFactory.build(props);

			return {
				props,
				result,
			};
		};

		it('should return a PutFileResponse with the correct properties', () => {
			const { props, result } = setup();

			expect(result.LastModifiedTime).toBe(props.LastModifiedTime);
		});
	});

	describe('buildFromFileRecord', () => {
		const setup = () => {
			const fileRecord = fileRecordTestFactory().build();
			const result = PutFileResponseFactory.buildFromFileRecord(fileRecord);

			return {
				fileRecord,
				result,
			};
		};

		it('should return a PutFileResponse with LastModifiedTime from fileRecord', () => {
			const { fileRecord, result } = setup();

			expect(result.LastModifiedTime).toBe(fileRecord.getProps().updatedAt.toISOString());
		});
	});
});
