import { ErrorLogMessage, Loggable } from '@infra/logger';
import { BadRequestException } from '@nestjs/common';
import { EntityId } from '@shared/domain/types';
import { ErrorType } from '../domain';

export class ToManyDifferentParentsException extends BadRequestException implements Loggable {
	constructor(
		private readonly parentInfos: { parentId: EntityId }[],
		private readonly numberOfAllowedParents: number
	) {
		super();
	}

	public getLogMessage(): ErrorLogMessage {
		const parentInfoIds = this.parentInfos.map((info) => info.parentId);
		const message = {
			type: ErrorType.TO_MANY_DIFFERENT_PARENTS,
			stack: this.stack,
			data: {
				parentInfos: parentInfoIds.toString(),
				numberOfAllowedParents: this.numberOfAllowedParents,
				numberOfParents: this.parentInfos.length,
			},
		};

		return message;
	}
}
