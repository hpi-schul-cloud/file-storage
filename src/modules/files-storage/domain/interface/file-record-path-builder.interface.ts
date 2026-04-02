import { FileRecord } from '../file-record.do';

export interface FileRecordPathBuilder {
	buildOriginPath(fileRecord: FileRecord): string;
	buildOriginPaths(fileRecords: FileRecord[]): string[];
	buildPreviewDirectoryPath(fileRecord: FileRecord): string;
	buildPreviewFilePath(fileRecord: FileRecord, hash: string): string;
}

export const FILE_RECORD_PATH_BUILDER = 'FILE_RECORD_PATH_BUILDER';
