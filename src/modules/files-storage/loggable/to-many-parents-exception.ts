import { ErrorLogMessage, Loggable } from '@infra/logger';
import { BadRequestException } from '@nestjs/common';
import { EntityId } from '@shared/domain/types';
import { ErrorType } from '../domain';

export class ToManyDifferentParentsException extends BadRequestException implements Loggable {
	constructor(
		private readonly parentIds: EntityId[],
		private readonly numberOfAllowedParents: number
	) {
		super();
	}

	public getLogMessage(): ErrorLogMessage {
		const message: ErrorLogMessage = {
			type: ErrorType.TO_MANY_DIFFERENT_PARENTS,
			stack: this.stack,
			data: {
				parentIds: this.parentIds.toString(),
				numberOfAllowedParents: this.numberOfAllowedParents,
				numberOfParents: this.parentIds.length,
			},
		};

		return message;
	}
}
