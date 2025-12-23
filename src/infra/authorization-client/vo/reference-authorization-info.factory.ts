import { ReferenceAuthorizationInfo } from './reference-authorization-info.vo';

export class ReferenceAuthorizationInfoFactory {
	public static build(props: ReferenceAuthorizationInfo): ReferenceAuthorizationInfo {
		return new ReferenceAuthorizationInfo(props);
	}
}
