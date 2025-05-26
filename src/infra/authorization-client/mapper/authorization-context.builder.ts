import {
	AuthorizationContextParams,
	AuthorizationContextParamsAction,
	AuthorizationContextParamsRequiredPermissions,
} from '../authorization-api-client';

export class AuthorizationContextBuilder {
	public static build(
		requiredPermissions: AuthorizationContextParamsRequiredPermissions[],
		action: AuthorizationContextParamsAction
	): AuthorizationContextParams {
		return {
			action,
			requiredPermissions,
		};
	}

	public static write(
		requiredPermissions: AuthorizationContextParamsRequiredPermissions[]
	): AuthorizationContextParams {
		const context = this.build(requiredPermissions, AuthorizationContextParamsAction.WRITE);

		return context;
	}

	public static read(requiredPermissions: AuthorizationContextParamsRequiredPermissions[]): AuthorizationContextParams {
		const context = this.build(requiredPermissions, AuthorizationContextParamsAction.READ);

		return context;
	}
}
