import { ErrorLogMessage, Loggable } from '@infra/logger';
import { InternalServerErrorException } from '@nestjs/common';
import { ErrorType } from '../error';
import { StorageLocationParams } from '../interface';

export class StorageLocationDeleteLoggableException extends InternalServerErrorException implements Loggable {
	constructor(
		private readonly payload: StorageLocationParams,
		private readonly error: unknown
	) {
		super(ErrorType.INTERNAL_SERVER_ERROR_STORAGE_LOCATION_DELETE, { cause: error });
	}

	public getLogMessage(): ErrorLogMessage {
		const { storageLocationId, storageLocation } = this.payload;

		const message: ErrorLogMessage = {
			type: ErrorType.INTERNAL_SERVER_ERROR_STORAGE_LOCATION_DELETE,
			stack: this.stack,
			data: {
				storageLocationId,
				storageLocation,
				originalMessage: 'Error while moving directory to trash.',
			},
		};

		return message;
	}
}
