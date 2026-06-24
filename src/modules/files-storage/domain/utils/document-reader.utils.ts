import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { FileDto } from '../dto';
import { FileDtoFactory } from '../factory';
import { DocumentType } from '../interface';
import { StorageType } from '../storage-paths.const';

export const readDocumentSource = async (targetFileName: string, documentType: DocumentType): Promise<FileDto> => {
	const sourceFileName = getDocumentSourceFileName(documentType);
	const sourceFilePath = resolveDocumentPath(sourceFileName);
	const sourceBuffer = await fs.readFile(sourceFilePath);
	const sourceStream = Readable.from(sourceBuffer);

	return FileDtoFactory.create(targetFileName, sourceStream, documentType, StorageType.STANDARD);
};

const getDocumentSourceFileName = (documentType: DocumentType): string => {
	switch (documentType) {
		case DocumentType.DOCX:
			return 'doc.docx';
		case DocumentType.XLSX:
			return 'spreadsheet.xlsx';
		case DocumentType.PPTX:
			return 'presentation.pptx';
		default:
			throw new Error(`Unsupported document type: ${documentType}`);
	}
};

const resolveDocumentPath = (sourceFileName: string): string => {
	return path.resolve(__dirname, '../../assets/documents', sourceFileName);
};
