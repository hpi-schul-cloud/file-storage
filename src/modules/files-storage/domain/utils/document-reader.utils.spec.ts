import { promises as fs } from 'node:fs';
import { FileDto } from '../dto';
import { DocumentType } from '../interface';
import { StorageType } from '../storage-paths.const';
import { readDocumentSource } from './document-reader.utils';

describe('readDocumentSource', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('when called with a valid documentType', () => {
		const setup = (documentType: DocumentType) => {
			const targetFileName = 'my-document';
			const readFileSpy = jest.spyOn(fs, 'readFile').mockResolvedValueOnce(Buffer.from('mock-content'));

			return { targetFileName, documentType, readFileSpy };
		};

		it.each([
			[DocumentType.DOCX, 'doc.docx'],
			[DocumentType.XLSX, 'spreadsheet.xlsx'],
			[DocumentType.PPTX, 'presentation.pptx'],
		])('should call fs.readFile with the correct source file path for %s', async (documentType, sourceFileName) => {
			const { targetFileName, readFileSpy } = setup(documentType);

			await readDocumentSource(targetFileName, documentType);

			expect(readFileSpy).toHaveBeenCalledWith(expect.stringContaining(sourceFileName));
		});

		it.each([DocumentType.DOCX, DocumentType.XLSX, DocumentType.PPTX])(
			'should return a FileDto with the targetFileName as name for %s',
			async (documentType) => {
				const { targetFileName } = setup(documentType);

				const result = await readDocumentSource(targetFileName, documentType);

				expect(result).toBeInstanceOf(FileDto);
				expect(result.name).toBe(targetFileName);
			}
		);

		it.each([DocumentType.DOCX, DocumentType.XLSX, DocumentType.PPTX])(
			'should return a FileDto with mimeType matching the documentType for %s',
			async (documentType) => {
				const { targetFileName } = setup(documentType);

				const result = await readDocumentSource(targetFileName, documentType);

				expect(result.mimeType).toBe(documentType);
			}
		);

		it.each([DocumentType.DOCX, DocumentType.XLSX, DocumentType.PPTX])(
			'should return a FileDto with storageType STANDARD for %s',
			async (documentType) => {
				const { targetFileName } = setup(documentType);

				const result = await readDocumentSource(targetFileName, documentType);

				expect(result.storageType).toBe(StorageType.STANDARD);
			}
		);
	});

	describe('when documentType is unsupported', () => {
		it('should throw an error', async () => {
			const invalidType = 'INVALID_TYPE' as DocumentType;

			await expect(readDocumentSource('my-document', invalidType)).rejects.toThrow(
				'Unsupported document type: INVALID_TYPE'
			);
		});
	});

	describe('when fs.readFile throws an error', () => {
		it('should propagate the error', async () => {
			const error = new Error('File not found');
			jest.spyOn(fs, 'readFile').mockRejectedValueOnce(error);

			await expect(readDocumentSource('my-document', DocumentType.DOCX)).rejects.toThrow(error);
		});
	});
});
