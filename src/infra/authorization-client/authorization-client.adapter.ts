import { JwtExtractor } from '@infra/auth-guard/utils/jwt';
import { AxiosErrorLoggable } from '@infra/error/loggable';
import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AxiosRequestConfig, isAxiosError } from 'axios';
import { Request } from 'express';
import {
	AuthorizationApi,
	AuthorizationBodyParamsReferenceType,
	AuthorizationContextParams,
} from './authorization-api-client';
import { AuthorizationErrorLoggableException, AuthorizationForbiddenLoggableException } from './error';

@Injectable()
export class AuthorizationClientAdapter {
	constructor(
		private readonly authorizationApi: AuthorizationApi,
		@Inject(REQUEST) private readonly request: Request
	) {}

	public async checkPermissionsByReference(
		referenceType: AuthorizationBodyParamsReferenceType,
		referenceId: string,
		context: AuthorizationContextParams
	): Promise<void> {
		const hasPermission = await this.hasPermissionsByReference(referenceType, referenceId, context);

		if (!hasPermission) {
			throw new AuthorizationForbiddenLoggableException({ referenceType, referenceId, context });
		}
	}

	public async hasPermissionsByReference(
		referenceType: AuthorizationBodyParamsReferenceType,
		referenceId: string,
		context: AuthorizationContextParams
	): Promise<boolean> {
		const params = {
			referenceType,
			referenceId,
			context,
		};

		try {
			const options = this.createOptionParams();

			const response = await this.authorizationApi.authorizationReferenceControllerAuthorizeByReference(
				params,
				options
			);
			const hasPermission = response.data.isAuthorized;

			return hasPermission;
		} catch (error) {
			if (isAxiosError(error)) {
				error = new AxiosErrorLoggable(error, 'AUTHORIZATION_BY_REFERENCE_FAILED');
			}

			throw new AuthorizationErrorLoggableException(error, params);
		}
	}

	private createOptionParams(): AxiosRequestConfig {
		const jwt = this.getJwt();
		const options: AxiosRequestConfig = { headers: { authorization: `Bearer ${jwt}` } };

		return options;
	}

	private getJwt(): string {
		return JwtExtractor.extractJwtFromRequestOrFail(this.request);
	}
}
