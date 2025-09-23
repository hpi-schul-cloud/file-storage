import { AuthorizationBodyParamsReferenceType } from '@infra/authorization-client';
import { NotImplementedException, StreamableFile } from '@nestjs/common';
import { ErrorType } from '../../domain';
import { FileRecordParentType, GetFileResponse, StorageLocation } from '../../domain/interface';

export class FilesStorageMapper {
	private static readonly authorizationEntityMap = new Map<FileRecordParentType, AuthorizationBodyParamsReferenceType>([
		[FileRecordParentType.Task, AuthorizationBodyParamsReferenceType.TASKS],
		[FileRecordParentType.Course, AuthorizationBodyParamsReferenceType.COURSES],
		[FileRecordParentType.User, AuthorizationBodyParamsReferenceType.USERS],
		[FileRecordParentType.School, AuthorizationBodyParamsReferenceType.SCHOOLS],
		[FileRecordParentType.Lesson, AuthorizationBodyParamsReferenceType.LESSONS],
		[FileRecordParentType.Submission, AuthorizationBodyParamsReferenceType.SUBMISSIONS],
		[FileRecordParentType.Grading, AuthorizationBodyParamsReferenceType.SUBMISSIONS],
		[FileRecordParentType.BoardNode, AuthorizationBodyParamsReferenceType.BOARDNODES],
		[FileRecordParentType.ExternalTool, AuthorizationBodyParamsReferenceType.EXTERNAL_TOOLS],
	]);

	private static readonly storageLocationMap = new Map<StorageLocation, AuthorizationBodyParamsReferenceType>([
		[StorageLocation.INSTANCE, AuthorizationBodyParamsReferenceType.INSTANCES],
		[StorageLocation.SCHOOL, AuthorizationBodyParamsReferenceType.SCHOOLS],
	]);

	public static mapToAllowedAuthorizationEntityType(type: FileRecordParentType): AuthorizationBodyParamsReferenceType {
		const res = this.authorizationEntityMap.get(type);

		if (!res) {
			throw new NotImplementedException();
		}

		return res;
	}
	public static mapToAllowedStorageLocationType(type: StorageLocation): AuthorizationBodyParamsReferenceType {
		const res = this.storageLocationMap.get(type);

		if (!res) {
			throw new NotImplementedException(ErrorType.STORAGE_LOCATION_TYPE_NOT_EXISTS);
		}

		return res;
	}

	public static mapToStreamableFile(fileResponse: GetFileResponse): StreamableFile {
		let disposition: string;

		if (fileResponse.contentType === 'application/pdf') {
			disposition = `inline;`;
		} else {
			disposition = `attachment;`;
		}

		const encodedFileName = encodeURIComponent(fileResponse.name);

		const streamableFile = new StreamableFile(fileResponse.data, {
			type: fileResponse.contentType,
			disposition: `${disposition}; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
			length: fileResponse.contentLength,
		});

		return streamableFile;
	}
}
