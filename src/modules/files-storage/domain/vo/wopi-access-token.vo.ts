import { ValueObject } from '@shared/domain/value-object.decorator';
import { IsUUID } from 'class-validator';

@ValueObject()
export class WopiAccessToken {
	constructor(props: WopiAccessToken) {
		this.token = props.token;
	}

	@IsUUID()
	public readonly token: string;
}
