import { FilesStorageConfigResponse } from '../dto/files-storage-config.response';

export class ConfigResponseMapper {
	public static mapToResponse(maxFileSize: number, collaboraMaxFileSize: number): FilesStorageConfigResponse {
		const mappedConfig = {
			MAX_FILE_SIZE: maxFileSize,
			COLLABORA_MAX_FILE_SIZE_IN_BYTES: collaboraMaxFileSize,
		};
		const configResponse = new FilesStorageConfigResponse(mappedConfig);

		return configResponse;
	}
}
