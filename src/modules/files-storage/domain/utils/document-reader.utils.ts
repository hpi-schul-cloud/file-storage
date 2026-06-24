import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { FileDto } from '../dto';
import { FileDtoFactory } from '../factory';
import { OfficeDocumentType } from '../interface';
import { StorageType } from '../storage-paths.const';

export const readOfficeDocumentSource = async (
	targetFileName: string,
	officeDocumentType: OfficeDocumentType
): Promise<FileDto> => {
	const sourceFileName = getOfficeDocumentSourceFileName(officeDocumentType);
	const sourceFilePath = resolveOfficeDocumentPath(sourceFileName);
	const sourceBuffer = await fs.readFile(sourceFilePath);
	const sourceStream = Readable.from(sourceBuffer);

	return FileDtoFactory.create(targetFileName, sourceStream, officeDocumentType, StorageType.STANDARD);
};

const getOfficeDocumentSourceFileName = (officeDocumentType: OfficeDocumentType): string => {
	switch (officeDocumentType) {
		case OfficeDocumentType.DOCX:
			return 'doc.docx';
		case OfficeDocumentType.XLSX:
			return 'spreadsheet.xlsx';
		case OfficeDocumentType.PPTX:
			return 'presentation.pptx';
		default:
			throw new Error(`Unsupported office document type: ${officeDocumentType}`);
	}
};

const resolveOfficeDocumentPath = (sourceFileName: string): string => {
	return path.resolve(__dirname, '../../assets/office-documents', sourceFileName);
};
