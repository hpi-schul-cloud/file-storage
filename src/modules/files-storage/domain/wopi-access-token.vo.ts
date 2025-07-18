import { ValueObject } from '@shared/domain/value-object.decorator';
import { IsUUID } from 'class-validator';

@ValueObject()
export class WoipAccessToken {
	constructor(token: string) {
		this.token = token;
	}

	@IsUUID()
	public readonly token: string;
}
