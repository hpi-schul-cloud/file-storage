import { PreviewInputMimeTypes } from '@infra/preview-generator';
import { BadRequestException } from '@nestjs/common';
import { AuthorizableObject, DomainObject } from '@shared/domain/domain-object';
import { EntityId } from '@shared/domain/types';
import path from 'path';
import { ErrorType } from './error';
import { FileRecordParentType, StorageLocation } from './interface';
import { FileRecordSecurityCheck, FileRecordSecurityCheckProps, ScanStatus } from './vo';

export enum PreviewOutputMimeTypes {
	IMAGE_WEBP = 'image/webp',
}

export interface ParentInfo {
	storageLocationId: EntityId;
	storageLocation: StorageLocation;
	parentId: EntityId;
	parentType: FileRecordParentType;
}

export enum PreviewStatus {
	PREVIEW_POSSIBLE = 'preview_possible',
	AWAITING_SCAN_STATUS = 'awaiting_scan_status',
	PREVIEW_NOT_POSSIBLE_SCAN_STATUS_ERROR = 'preview_not_possible_scan_status_error',
	PREVIEW_NOT_POSSIBLE_SCAN_STATUS_WONT_CHECK = 'preview_not_possible_scan_status_wont_check',
	PREVIEW_NOT_POSSIBLE_SCAN_STATUS_BLOCKED = 'preview_not_possible_scan_status_blocked',
	PREVIEW_NOT_POSSIBLE_WRONG_MIME_TYPE = 'preview_not_possible_wrong_mime_type',
}

export enum CollaboraMimeTypes {
	DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	DOC = 'application/msword',
	ODT = 'application/vnd.oasis.opendocument.text',
	RTF = 'application/rtf',
	TXT = 'text/plain',
	XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	XLS = 'application/vnd.ms-excel',
	ODS = 'application/vnd.oasis.opendocument.spreadsheet',
	CSV = 'text/csv',
	PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	PPT = 'application/vnd.ms-powerpoint',
	ODP = 'application/vnd.oasis.opendocument.presentation',
}

export interface FileRecordProps extends AuthorizableObject {
	id: EntityId;
	size: number;
	name: string;
	mimeType: string;
	parentType: FileRecordParentType;
	parentId: EntityId;
	creatorId?: EntityId;
	storageLocation: StorageLocation;
	storageLocationId: EntityId;
	deletedSince?: Date;
	isCopyFrom?: EntityId;
	isUploading?: boolean;
	createdAt: Date;
	updatedAt: Date;
	contentLastModifiedAt?: Date;
}

export class FileRecord extends DomainObject<FileRecordProps> {
	constructor(
		props: FileRecordProps,
		private securityCheck: FileRecordSecurityCheck
	) {
		super(props);
	}

	// --- should be part of a aggregate that contain a file-record array ---
	public static hasDuplicateName(fileRecords: FileRecord[], fileName: string): FileRecord | undefined {
		const foundFileRecord = fileRecords.find((item: FileRecord) => item.hasName(fileName));

		return foundFileRecord;
	}

	public static removeCreatorId(fileRecords: FileRecord[]): void {
		fileRecords.forEach((entity: FileRecord) => entity.removeCreatorId());
	}

	public static resolveFileNameDuplicates(fileRecords: FileRecord[], fileName: string): string {
		let counter = 0;
		const filenameObj = path.parse(fileName);
		let newFilename = fileName;

		while (FileRecord.hasDuplicateName(fileRecords, newFilename)) {
			counter += 1;
			newFilename = `${filenameObj.name} (${counter})${filenameObj.ext}`;
		}

		return newFilename;
	}

	public static markForDelete(fileRecords: FileRecord[]): void {
		fileRecords.forEach((fileRecord) => {
			fileRecord.markForDelete();
		});
	}

	public static unmarkForDelete(fileRecords: FileRecord[]): void {
		fileRecords.forEach((fileRecord) => {
			fileRecord.unmarkForDelete();
		});
	}

	public static getPaths(fileRecords: FileRecord[]): string[] {
		const paths = fileRecords.map((fileRecord) => fileRecord.createPath());

		return paths;
	}

	// ---------------------------------------------------------

	public static getFormat(mimeType: string): string {
		const format = mimeType.split('/')[1];

		if (!format) {
			throw new Error(`could not get format from mime type: ${mimeType}`);
		}

		return format;
	}

	public static getUniqueParents(fileRecords: FileRecord[]): Map<EntityId, FileRecordParentType> {
		const parentMap = new Map<EntityId, FileRecordParentType>();

		for (const fileRecord of fileRecords) {
			const { parentType, parentId } = fileRecord.getParentInfo();

			if (!parentMap.has(parentId)) {
				parentMap.set(parentId, parentType);
			}
		}

		return parentMap;
	}

	public getSecurityCheckProps(): FileRecordSecurityCheckProps {
		const securityCheckProps = this.securityCheck.getProps();

		return securityCheckProps;
	}

	public createSecurityScanBasedOnStatus(): FileRecordSecurityCheck {
		const securityCheck = this.securityCheck.isVerified()
			? this.securityCheck.copy()
			: FileRecordSecurityCheck.createWithDefaultProps();

		return securityCheck;
	}

	get sizeInByte(): number {
		return this.props.size;
	}

	get mimeType(): string {
		return this.props.mimeType;
	}

	public updateSecurityCheckStatus(status: ScanStatus, reason: string): void {
		this.securityCheck = FileRecordSecurityCheck.scanned(status, reason);
	}

	public getSecurityToken(): string | undefined {
		return this.securityCheck.requestToken;
	}

	public isBlocked(): boolean {
		return this.securityCheck.isBlocked();
	}

	public isPending(): boolean {
		return this.securityCheck.isPending();
	}

	public markForDelete(): void {
		this.props.deletedSince = new Date();
	}

	public unmarkForDelete(): void {
		this.props.deletedSince = undefined;
	}

	public setName(name: string): void {
		if (name.length === 0) {
			throw new BadRequestException(ErrorType.FILE_NAME_EMPTY);
		}

		this.props.name = name;
	}

	public hasName(name: string): boolean {
		const hasName = this.props.name === name;

		return hasName;
	}

	public getName(): string {
		return this.props.name;
	}

	public getMimeType(): string {
		return this.props.mimeType;
	}

	public isPreviewPossible(): boolean {
		const isPreviewPossible = Object.values<string>(PreviewInputMimeTypes).includes(this.props.mimeType);

		return isPreviewPossible;
	}

	public isCollaboraEditable(): boolean {
		const hasCollaboraCompatibleMimeType = Object.values<string>(CollaboraMimeTypes).includes(this.props.mimeType);
		const isBlocked = this.securityCheck.isBlocked();

		const isEditable = hasCollaboraCompatibleMimeType && !isBlocked;

		return isEditable;
	}

	public getParentInfo(): ParentInfo {
		const { parentId, parentType, storageLocation, storageLocationId } = this.getProps();

		return { parentId, parentType, storageLocation, storageLocationId };
	}

	public getPreviewStatus(): PreviewStatus {
		if (this.securityCheck.isBlocked()) {
			return PreviewStatus.PREVIEW_NOT_POSSIBLE_SCAN_STATUS_BLOCKED;
		}

		if (!this.isPreviewPossible()) {
			return PreviewStatus.PREVIEW_NOT_POSSIBLE_WRONG_MIME_TYPE;
		}

		if (this.securityCheck.isVerified()) {
			return PreviewStatus.PREVIEW_POSSIBLE;
		}

		if (this.securityCheck.isPending()) {
			return PreviewStatus.AWAITING_SCAN_STATUS;
		}

		if (this.securityCheck.hasScanStatusWontCheck()) {
			return PreviewStatus.PREVIEW_NOT_POSSIBLE_SCAN_STATUS_WONT_CHECK;
		}

		return PreviewStatus.PREVIEW_NOT_POSSIBLE_SCAN_STATUS_ERROR;
	}

	get scanStatus(): ScanStatus {
		return this.securityCheck.status;
	}

	get fileNameWithoutExtension(): string {
		const filenameObj = path.parse(this.getName());

		return filenameObj.name;
	}

	public getPreviewName(outputFormat?: PreviewOutputMimeTypes): string {
		if (!outputFormat) {
			return this.props.name;
		}

		const format = FileRecord.getFormat(outputFormat);
		const previewFileName = `${this.fileNameWithoutExtension}.${format}`;

		return previewFileName;
	}

	public removeCreatorId(): void {
		this.props.creatorId = undefined;
	}

	private setSizeInByte(sizeInByte: number, maxSizeInByte: number): void {
		if (sizeInByte < 0) {
			throw new BadRequestException(ErrorType.FILE_IS_EMPTY);
		}
		if (sizeInByte > maxSizeInByte) {
			throw new BadRequestException(ErrorType.FILE_TOO_BIG);
		}
		this.props.size = sizeInByte;
	}

	public markAsUploaded(sizeInByte: number, maxSizeInByte: number): void {
		this.setSizeInByte(sizeInByte, maxSizeInByte);
		this.props.isUploading = undefined;
	}

	public createPath(): string {
		const path = [this.props.storageLocationId, this.id].join('/');

		return path;
	}

	public createPreviewDirectoryPath(): string {
		const path = ['previews', this.props.storageLocationId, this.id].join('/');

		return path;
	}

	public createPreviewFilePath(hash: string): string {
		const folderPath = this.createPreviewDirectoryPath();
		const filePath = [folderPath, hash].join('/');

		return filePath;
	}

	public getContentLastModifiedAt(): Date | undefined {
		return this.props.contentLastModifiedAt;
	}

	public touchContentLastModifiedAt(): void {
		this.props.contentLastModifiedAt = new Date();
	}
}
