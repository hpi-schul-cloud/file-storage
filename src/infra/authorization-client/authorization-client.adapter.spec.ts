import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AxiosErrorLoggable } from '@infra/error/loggable';
import { REQUEST } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { Request } from 'express';
import { randomBytes } from 'node:crypto';
import {
	AccessTokenPayloadResponse,
	AccessTokenResponse,
	AuthorizationApi,
	AuthorizationBodyParams,
	AuthorizationBodyParamsReferenceType,
	AuthorizationContextParamsAction,
	AuthorizationContextParamsRequiredPermissions,
	AuthorizedResponse,
} from './authorization-api-client';
import { AuthorizationClientAdapter } from './authorization-client.adapter';
import {
	AuthorizationErrorLoggableException,
	AuthorizationForbiddenLoggableException,
	ResolveTokenErrorLoggableException,
} from './error';

jest.mock('@infra/error/loggable');

const jwtToken = randomBytes(32).toString('hex');
const requiredPermissions: AuthorizationContextParamsRequiredPermissions[] = [
	AuthorizationContextParamsRequiredPermissions.ACCOUNT_CREATE,
	AuthorizationContextParamsRequiredPermissions.ACCOUNT_DELETE,
];

describe(AuthorizationClientAdapter.name, () => {
	let module: TestingModule;
	let service: AuthorizationClientAdapter;
	let authorizationApi: DeepMocked<AuthorizationApi>;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			providers: [
				AuthorizationClientAdapter,
				{
					provide: AuthorizationApi,
					useValue: createMock<AuthorizationApi>(),
				},
				{
					provide: REQUEST,
					useValue: createMock<Request>({
						headers: {
							authorization: `Bearer ${jwtToken}`,
						},
					}),
				},
			],
		}).compile();

		service = module.get(AuthorizationClientAdapter);
		authorizationApi = module.get(AuthorizationApi);
	});

	afterAll(async () => {
		await module.close();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('checkPermissionsByReference', () => {
		describe('when authorizationReferenceControllerAuthorizeByReference resolves successful', () => {
			const setup = (props: { isAuthorized: boolean }) => {
				const params: AuthorizationBodyParams = {
					context: {
						action: AuthorizationContextParamsAction.READ,
						requiredPermissions,
					},
					referenceType: AuthorizationBodyParamsReferenceType.COURSES,
					referenceId: 'someReferenceId',
				};

				const response = createMock<AxiosResponse<AuthorizedResponse>>({
					data: {
						isAuthorized: props.isAuthorized,
						userId: 'userId',
					},
				});
				authorizationApi.authorizationReferenceControllerAuthorizeByReference.mockResolvedValueOnce(response);

				return { params };
			};

			it('should call authorizationReferenceControllerAuthorizeByReference with correct params', async () => {
				const { params } = setup({ isAuthorized: true });

				const expectedOptions = { headers: { authorization: `Bearer ${jwtToken}` } };

				await service.checkPermissionsByReference(params.referenceType, params.referenceId, params.context);

				expect(authorizationApi.authorizationReferenceControllerAuthorizeByReference).toHaveBeenCalledWith(
					params,
					expectedOptions
				);
			});

			describe('when permission is granted', () => {
				it('should resolve', async () => {
					const { params } = setup({ isAuthorized: true });

					await expect(
						service.checkPermissionsByReference(params.referenceType, params.referenceId, params.context)
					).resolves.toBeUndefined();
				});
			});

			describe('when permission is denied', () => {
				it('should throw AuthorizationForbiddenLoggableException', async () => {
					const { params } = setup({ isAuthorized: false });

					const expectedError = new AuthorizationForbiddenLoggableException(params);

					await expect(
						service.checkPermissionsByReference(params.referenceType, params.referenceId, params.context)
					).rejects.toThrow(expectedError);
				});
			});
		});

		describe('when authorizationReferenceControllerAuthorizeByReference returns error', () => {
			const setup = () => {
				const params = {
					context: {
						action: AuthorizationContextParamsAction.READ,
						requiredPermissions,
					},
					referenceType: AuthorizationBodyParamsReferenceType.COURSES,
					referenceId: 'someReferenceId',
				};

				const error = new Error('testError');
				authorizationApi.authorizationReferenceControllerAuthorizeByReference.mockRejectedValueOnce(error);

				return { params, error };
			};

			it('should throw AuthorizationErrorLoggableException', async () => {
				const { params, error } = setup();

				const expectedError = new AuthorizationErrorLoggableException(error, params);

				await expect(
					service.checkPermissionsByReference(params.referenceType, params.referenceId, params.context)
				).rejects.toThrow(expectedError);
			});
		});
	});

	describe('hasPermissionsByReference', () => {
		describe('when authorizationReferenceControllerAuthorizeByReference resolves successful', () => {
			const setup = () => {
				const params = {
					context: {
						action: AuthorizationContextParamsAction.READ,
						requiredPermissions,
					},
					referenceType: AuthorizationBodyParamsReferenceType.COURSES,
					referenceId: 'someReferenceId',
				};

				const response = createMock<AxiosResponse<AuthorizedResponse>>({
					data: {
						isAuthorized: true,
						userId: 'userId',
					},
				});
				authorizationApi.authorizationReferenceControllerAuthorizeByReference.mockResolvedValueOnce(response);

				return { params, response };
			};

			it('should call authorizationReferenceControllerAuthorizeByReference with the correct params', async () => {
				const { params } = setup();

				const expectedOptions = { headers: { authorization: `Bearer ${jwtToken}` } };

				await service.hasPermissionsByReference(params.referenceType, params.referenceId, params.context);

				expect(authorizationApi.authorizationReferenceControllerAuthorizeByReference).toHaveBeenCalledWith(
					params,
					expectedOptions
				);
			});

			it('should return isAuthorized', async () => {
				const { params, response } = setup();

				const result = await service.hasPermissionsByReference(
					params.referenceType,
					params.referenceId,
					params.context
				);

				expect(result).toEqual(response.data.isAuthorized);
			});
		});

		describe('when cookie header contains JWT token', () => {
			const setup = () => {
				const params = {
					context: {
						action: AuthorizationContextParamsAction.READ,
						requiredPermissions,
					},
					referenceType: AuthorizationBodyParamsReferenceType.COURSES,
					referenceId: 'someReferenceId',
				};

				const response = createMock<AxiosResponse<AuthorizedResponse>>({
					data: {
						isAuthorized: true,
						userId: 'userId',
					},
				});
				authorizationApi.authorizationReferenceControllerAuthorizeByReference.mockResolvedValueOnce(response);

				const request = createMock<Request>({
					headers: {
						cookie: `jwt=${jwtToken}`,
					},
				});
				const adapter = new AuthorizationClientAdapter(authorizationApi, request);

				return { params, adapter };
			};

			it('should forward the JWT as bearer token', async () => {
				const { params, adapter } = setup();

				const expectedOptions = { headers: { authorization: `Bearer ${jwtToken}` } };

				await adapter.hasPermissionsByReference(params.referenceType, params.referenceId, params.context);

				expect(authorizationApi.authorizationReferenceControllerAuthorizeByReference).toHaveBeenCalledWith(
					params,
					expectedOptions
				);
			});
		});

		describe('when no JWT token is found', () => {
			const setup = () => {
				const params = {
					context: {
						action: AuthorizationContextParamsAction.READ,
						requiredPermissions,
					},
					referenceType: AuthorizationBodyParamsReferenceType.COURSES,
					referenceId: 'someReferenceId',
				};

				const request = createMock<Request>({
					headers: {},
				});
				const adapter = new AuthorizationClientAdapter(authorizationApi, request);

				const error = new Error('Authentication is required.');

				return { params, adapter, error };
			};

			it('should throw an AuthorizationErrorLoggableException', async () => {
				const { params, adapter, error } = setup();

				const expectedError = new AuthorizationErrorLoggableException(error, params);

				await expect(
					adapter.hasPermissionsByReference(params.referenceType, params.referenceId, params.context)
				).rejects.toThrow(expectedError);
			});
		});

		describe('when authorizationReferenceControllerAuthorizeByReference returns error', () => {
			const setup = () => {
				const params = {
					context: {
						action: AuthorizationContextParamsAction.READ,
						requiredPermissions,
					},
					referenceType: AuthorizationBodyParamsReferenceType.COURSES,
					referenceId: 'someReferenceId',
				};

				const error = new Error('testError');
				authorizationApi.authorizationReferenceControllerAuthorizeByReference.mockRejectedValueOnce(error);

				return { params, error };
			};

			it('should throw AuthorizationErrorLoggableException', async () => {
				const { params, error } = setup();

				const expectedError = new AuthorizationErrorLoggableException(error, params);

				await expect(
					service.hasPermissionsByReference(params.referenceType, params.referenceId, params.context)
				).rejects.toThrow(expectedError);
			});
		});

		describe('when isAxiosError returns true', () => {
			const setup = () => {
				const params = {
					context: {
						action: AuthorizationContextParamsAction.READ,
						requiredPermissions,
					},
					referenceType: AuthorizationBodyParamsReferenceType.COURSES,
					referenceId: 'someReferenceId',
				};

				const axiosError = new Error('axios error');
				const spyIsAxiosError = jest.spyOn(require('axios'), 'isAxiosError').mockReturnValue(true);

				authorizationApi.authorizationReferenceControllerAuthorizeByReference.mockRejectedValueOnce(axiosError);

				return { params, axiosError, spyIsAxiosError };
			};

			it('should wrap the error with AxiosErrorLoggable and throw AuthorizationErrorLoggableException', async () => {
				const { params, axiosError, spyIsAxiosError } = setup();

				await expect(
					service.hasPermissionsByReference(params.referenceType, params.referenceId, params.context)
				).rejects.toThrow(AuthorizationErrorLoggableException);

				expect(spyIsAxiosError).toHaveBeenCalledWith(axiosError);
				expect(AxiosErrorLoggable).toHaveBeenCalledWith(axiosError, 'AUTHORIZATION_BY_REFERENCE_FAILED');
			});
		});
	});

	describe('createToken', () => {
		describe('when createToken resolves', () => {
			const setup = () => {
				const params = {
					context: {
						action: AuthorizationContextParamsAction.READ,
						requiredPermissions,
					},
					referenceType: AuthorizationBodyParamsReferenceType.COURSES,
					referenceId: 'someReferenceId',
					payload: {},
				};
				const expectedResponse = createMock<AxiosResponse<AccessTokenResponse>>({
					data: { token: 'abc' },
				});

				authorizationApi.authorizationReferenceControllerCreateToken.mockResolvedValueOnce(expectedResponse);

				return { params, expectedResponse };
			};

			it('should return the token response', async () => {
				const { params, expectedResponse } = setup();

				const result = await service.createToken(params);

				expect(result).toEqual(expectedResponse.data);
			});
		});

		describe('when createToken rejects', () => {
			const setup = () => {
				const params = {
					context: {
						action: AuthorizationContextParamsAction.READ,
						requiredPermissions,
					},
					referenceType: AuthorizationBodyParamsReferenceType.COURSES,
					referenceId: 'someReferenceId',
					payload: {},
				};
				const error = new Error('fail');

				authorizationApi.authorizationReferenceControllerCreateToken.mockRejectedValueOnce(error);

				return { params, error };
			};

			it('should throw AuthorizationErrorLoggableException', async () => {
				const { params } = setup();

				await expect(service.createToken(params)).rejects.toBeInstanceOf(AuthorizationErrorLoggableException);
			});
		});

		describe('when isAxiosError returns true', () => {
			const setup = () => {
				const params = {
					context: {
						action: AuthorizationContextParamsAction.READ,
						requiredPermissions,
					},
					referenceType: AuthorizationBodyParamsReferenceType.COURSES,
					referenceId: 'someReferenceId',
					payload: {},
				};

				const axiosError = new Error('axios error');
				const spyIsAxiosError = jest.spyOn(require('axios'), 'isAxiosError').mockReturnValue(true);

				authorizationApi.authorizationReferenceControllerCreateToken.mockRejectedValueOnce(axiosError);

				return { params, axiosError, spyIsAxiosError };
			};

			it('should wrap the error with AxiosErrorLoggable and throw AuthorizationErrorLoggableException', async () => {
				const { params, axiosError, spyIsAxiosError } = setup();

				await expect(service.createToken(params)).rejects.toThrow(AuthorizationErrorLoggableException);

				expect(spyIsAxiosError).toHaveBeenCalledWith(axiosError);
				expect(AxiosErrorLoggable).toHaveBeenCalledWith(axiosError, 'CREATE_ACCESS_TOKEN_FAILED');
			});
		});
	});

	describe('resolveToken', () => {
		describe('when resolveToken resolves', () => {
			const setup = () => {
				const token = 'abc';
				const expectedResponse = createMock<AxiosResponse<AccessTokenPayloadResponse>>({
					data: { payload: { test: 'abc' } },
				});

				authorizationApi.authorizationReferenceControllerResolveToken.mockResolvedValueOnce(expectedResponse);

				return { token, expectedResponse };
			};

			it('should return the payload response', async () => {
				const { token, expectedResponse } = setup();

				const result = await service.resolveToken(token);

				expect(result).toEqual(expectedResponse.data);
			});
		});

		describe('when resolveToken rejects', () => {
			const setup = () => {
				const token = 'abc';
				const error = new Error('fail');

				authorizationApi.authorizationReferenceControllerResolveToken.mockRejectedValueOnce(error);

				return { token, error };
			};

			it('should throw ResolveTokenErrorLoggableException', async () => {
				const { token } = setup();

				await expect(service.resolveToken(token)).rejects.toBeInstanceOf(ResolveTokenErrorLoggableException);
			});
		});

		describe('when isAxiosError returns true', () => {
			const setup = () => {
				const token = 'abc';

				const axiosError = new Error('axios error');
				const spyIsAxiosError = jest.spyOn(require('axios'), 'isAxiosError').mockReturnValue(true);

				authorizationApi.authorizationReferenceControllerResolveToken.mockRejectedValueOnce(axiosError);

				return { token, axiosError, spyIsAxiosError };
			};

			it('should wrap the error with AxiosErrorLoggable and throw AuthorizationErrorLoggableException', async () => {
				const { token, axiosError, spyIsAxiosError } = setup();

				await expect(service.resolveToken(token)).rejects.toThrow(ResolveTokenErrorLoggableException);

				expect(spyIsAxiosError).toHaveBeenCalledWith(axiosError);
				expect(AxiosErrorLoggable).toHaveBeenCalledWith(axiosError, 'RESOLVE_ACCESS_TOKEN_FAILED');
			});
		});
	});
});
