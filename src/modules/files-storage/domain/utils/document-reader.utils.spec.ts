import { promises as fs } from 'node:fs';
import { FileDto } from '../dto';
import { OfficeDocumentType } from '../interface';
import { StorageType } from '../storage-paths.const';
import { readOfficeDocumentSource } from './document-reader.utils';

describe('readOfficeDocumentSource', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('when called with a valid officeDocumentType', () => {
		const setup = (officeDocumentType: OfficeDocumentType) => {
			const targetFileName = 'my-document';
			const readFileSpy = jest.spyOn(fs, 'readFile').mockResolvedValueOnce(Buffer.from('mock-content'));

			return { targetFileName, officeDocumentType, readFileSpy };
		};

		it.each([
			[OfficeDocumentType.DOCX, 'doc.docx'],
			[OfficeDocumentType.XLSX, 'spreadsheet.xlsx'],
			[OfficeDocumentType.PPTX, 'presentation.pptx'],
		])(
			'should call fs.readFile with the correct source file path for %s',
			async (officeDocumentType, sourceFileName) => {
				const { targetFileName, readFileSpy } = setup(officeDocumentType);

				await readOfficeDocumentSource(targetFileName, officeDocumentType);

				expect(readFileSpy).toHaveBeenCalledWith(expect.stringContaining(sourceFileName));
			}
		);

		it.each([OfficeDocumentType.DOCX, OfficeDocumentType.XLSX, OfficeDocumentType.PPTX])(
			'should return a FileDto with the targetFileName as name for %s',
			async (officeDocumentType) => {
				const { targetFileName } = setup(officeDocumentType);

				const result = await readOfficeDocumentSource(targetFileName, officeDocumentType);

				expect(result).toBeInstanceOf(FileDto);
				expect(result.name).toBe(targetFileName);
			}
		);

		it.each([OfficeDocumentType.DOCX, OfficeDocumentType.XLSX, OfficeDocumentType.PPTX])(
			'should return a FileDto with mimeType matching the officeDocumentType for %s',
			async (officeDocumentType) => {
				const { targetFileName } = setup(officeDocumentType);

				const result = await readOfficeDocumentSource(targetFileName, officeDocumentType);

				expect(result.mimeType).toBe(officeDocumentType);
			}
		);

		it.each([OfficeDocumentType.DOCX, OfficeDocumentType.XLSX, OfficeDocumentType.PPTX])(
			'should return a FileDto with storageType STANDARD for %s',
			async (officeDocumentType) => {
				const { targetFileName } = setup(officeDocumentType);

				const result = await readOfficeDocumentSource(targetFileName, officeDocumentType);

				expect(result.storageType).toBe(StorageType.STANDARD);
			}
		);
	});

	describe('when officeDocumentType is unsupported', () => {
		it('should throw an error', async () => {
			const invalidType = 'INVALID_TYPE' as OfficeDocumentType;

			await expect(readOfficeDocumentSource('my-document', invalidType)).rejects.toThrow(
				'Unsupported office document type: INVALID_TYPE'
			);
		});
	});

	describe('when fs.readFile throws an error', () => {
		it('should propagate the error', async () => {
			const error = new Error('File not found');
			jest.spyOn(fs, 'readFile').mockRejectedValueOnce(error);

			await expect(readOfficeDocumentSource('my-document', OfficeDocumentType.DOCX)).rejects.toThrow(error);
		});
	});
});
