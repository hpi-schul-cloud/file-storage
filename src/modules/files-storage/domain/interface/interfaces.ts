import { type EntityId } from '@shared/domain/types';
import type { Readable } from 'node:stream';
import { type FileRecord, type PreviewOutputMimeTypes } from '../file-record.do';
import { type PreviewWidth } from './preview-width.enum';
import { type StorageLocation } from './storage-location.enum';

export interface GetFileResponse {
	data: Readable;
	etag?: string;
	contentType?: string;
	contentLength?: number;
	contentRange?: string;
	name: string;
}

export interface PreviewInfo {
	outputFormat?: PreviewOutputMimeTypes;
	width?: PreviewWidth;
	forceUpdate?: boolean;
}

export interface PreviewFileParams {
	fileRecord: FileRecord;
	previewParams: PreviewInfo;
	hash: string;
	format: string;
	bytesRange?: string;
}

export interface StorageLocationParams {
	storageLocationId: EntityId;
	storageLocation: StorageLocation;
}

export interface CopyFileResult {
	id?: string;
	sourceId: string;
	name: string;
}
