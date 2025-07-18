import { JwtExtractor } from '@infra/auth-guard/utils/jwt';
import { AxiosErrorLoggable } from '@infra/error/loggable';
import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AxiosRequestConfig, isAxiosError } from 'axios';
import { Request } from 'express';
import {
	AccessTokenPayloadResponse,
	AccessTokenResponse,
	AuthorizationApi,
	AuthorizationBodyParamsReferenceType,
	AuthorizationContextParams,
	CreateAccessTokenParams,
} from './authorization-api-client';
import {
	AuthorizationErrorLoggableException,
	AuthorizationForbiddenLoggableException,
	ResolveTokenErrorLoggableException,
} from './error';

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

	public async createToken(params: CreateAccessTokenParams): Promise<AccessTokenResponse> {
		try {
			const options = this.createOptionParams();

			const response = await this.authorizationApi.authorizationReferenceControllerCreateToken(params, options);

			return response.data;
		} catch (error) {
			if (isAxiosError(error)) {
				error = new AxiosErrorLoggable(error, 'CREATE_ACCESS_TOKEN_FAILED');
			}

			throw new AuthorizationErrorLoggableException(error, params);
		}
	}

	public async resolveToken(token: string, tokenTtl: number): Promise<AccessTokenPayloadResponse> {
		try {
			const options = this.createOptionParams();

			const response = await this.authorizationApi.authorizationReferenceControllerResolveToken(
				token,
				tokenTtl,
				options
			);

			return response.data;
		} catch (error) {
			if (isAxiosError(error)) {
				error = new AxiosErrorLoggable(error, 'RESOLVE_ACCESS_TOKEN_FAILED');
			}

			throw new ResolveTokenErrorLoggableException(error, token);
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
