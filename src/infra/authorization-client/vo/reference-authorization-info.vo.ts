import { ValueObject } from '@shared/domain/value-object.decorator';
import { IsBoolean, IsString } from 'class-validator';

@ValueObject()
export class ReferenceAuthorizationInfo {
	@IsString()
	public readonly referenceType: string;

	@IsString()
	public readonly referenceId: string;

	@IsBoolean()
	public readonly isAuthorized: boolean;

	constructor(props: ReferenceAuthorizationInfo) {
		this.referenceType = props.referenceType;
		this.referenceId = props.referenceId;
		this.isAuthorized = props.isAuthorized;
	}
}
