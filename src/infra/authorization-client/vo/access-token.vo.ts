import { ValueObject } from '@shared/domain/value-object.decorator';
import { Matches } from 'class-validator';

export const accessTokenRegex = /^[a-zA-Z0-9_-]{24}$/;

@ValueObject()
export class AccessToken {
	constructor(props: AccessToken) {
		this.token = props.token;
	}

	@Matches(accessTokenRegex, { message: 'Token must be a valid string.' })
	public readonly token: string;
}
