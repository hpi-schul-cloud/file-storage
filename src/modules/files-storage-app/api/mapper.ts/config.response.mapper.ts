import { FilesStorageConfigResponse } from '../dto/files-storage-config.response';

export class ConfigResponseMapper {
	public static mapToResponse(
		maxFileSize: number,
		collaboraMaxFileSize: number,
		maxFilesPerParent: number
	): FilesStorageConfigResponse {
		const mappedConfig = {
			MAX_FILE_SIZE: maxFileSize,
			COLLABORA_MAX_FILE_SIZE_IN_BYTES: collaboraMaxFileSize,
			FILES_STORAGE_MAX_FILES_PER_PARENT: maxFilesPerParent,
		};
		const configResponse = new FilesStorageConfigResponse(mappedConfig);

		return configResponse;
	}
}
