import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { generateNanoId } from '@infra/authorization-client/testing';
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
	AuthorizationManyReferencesBodyParams,
	AuthorizedByReferenceResponse,
	AuthorizedResponse,
} from './authorization-api-client';
import { AuthorizationClientAdapter } from './authorization-client.adapter';
import {
	AuthorizationErrorLoggableException,
	AuthorizationForbiddenLoggableException,
	AuthorizationManyReferencesErrorLoggableException,
	AuthorizationManyReferencesForbiddenLoggableException,
	ResolveTokenErrorLoggableException,
} from './error';
import { AccessToken, ReferenceAuthorizationInfo } from './vo';

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

	describe('hasPermissionsByManyReferences', () => {
		describe('when authorizationReferenceControllerAuthorizeByReferences resolves successful', () => {
			const setup = () => {
				const params: AuthorizationManyReferencesBodyParams = {
					references: [
						{
							context: {
								action: AuthorizationContextParamsAction.READ,
								requiredPermissions,
							},
							referenceType: AuthorizationBodyParamsReferenceType.COURSES,
							referenceId: 'someReferenceId',
						},
					],
				};

				const response = createMock<AxiosResponse<AuthorizedByReferenceResponse[]>>({
					data: [
						{
							userId: 'userId',
							isAuthorized: true,
							referenceType: params.references[0].referenceType,
							referenceId: params.references[0].referenceId,
						},
					],
				});
				authorizationApi.authorizationReferenceControllerAuthorizeByReferences.mockResolvedValueOnce(response);

				return { params, response };
			};

			it('should call authorizationReferenceControllerAuthorizeByReferences with the correct params', async () => {
				const { params } = setup();

				const expectedOptions = { headers: { authorization: `Bearer ${jwtToken}` } };

				await service.hasPermissionsByManyReferences(params);

				expect(authorizationApi.authorizationReferenceControllerAuthorizeByReferences).toHaveBeenCalledWith(
					params,
					expectedOptions
				);
			});

			it('should return ReferenceAuthorizationInfo[]', async () => {
				const { params, response } = setup();

				const result = await service.hasPermissionsByManyReferences(params);

				const expectedResult: ReferenceAuthorizationInfo[] = [
					{
						referenceType: params.references[0].referenceType,
						referenceId: params.references[0].referenceId,
						isAuthorized: response.data[0].isAuthorized,
					},
				];

				expect(result).toEqual(expectedResult);
			});
		});

		describe('when cookie header contains JWT token', () => {
			const setup = () => {
				const params: AuthorizationManyReferencesBodyParams = {
					references: [
						{
							context: {
								action: AuthorizationContextParamsAction.READ,
								requiredPermissions,
							},
							referenceType: AuthorizationBodyParamsReferenceType.COURSES,
							referenceId: 'someReferenceId',
						},
					],
				};

				const response = createMock<AxiosResponse<AuthorizedByReferenceResponse[]>>({
					data: [
						{
							userId: 'userId',
							isAuthorized: true,
							referenceType: params.references[0].referenceType,
							referenceId: params.references[0].referenceId,
						},
					],
				});
				authorizationApi.authorizationReferenceControllerAuthorizeByReferences.mockResolvedValueOnce(response);

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

				await adapter.hasPermissionsByManyReferences(params);

				expect(authorizationApi.authorizationReferenceControllerAuthorizeByReferences).toHaveBeenCalledWith(
					params,
					expectedOptions
				);
			});
		});

		describe('when no JWT token is found', () => {
			const setup = () => {
				const params: AuthorizationManyReferencesBodyParams = {
					references: [
						{
							context: {
								action: AuthorizationContextParamsAction.READ,
								requiredPermissions,
							},
							referenceType: AuthorizationBodyParamsReferenceType.COURSES,
							referenceId: 'someReferenceId',
						},
					],
				};

				const request = createMock<Request>({
					headers: {},
				});
				const adapter = new AuthorizationClientAdapter(authorizationApi, request);

				const error = new Error('Authentication is required.');

				return { params, adapter, error };
			};

			it('should throw an AuthorizationManyReferencesErrorLoggableException', async () => {
				const { params, adapter, error } = setup();

				const expectedError = new AuthorizationManyReferencesErrorLoggableException(error, params);

				await expect(adapter.hasPermissionsByManyReferences(params)).rejects.toThrow(expectedError);
			});
		});

		describe('when authorizationReferenceControllerAuthorizeByReferences returns error', () => {
			const setup = () => {
				const params: AuthorizationManyReferencesBodyParams = {
					references: [
						{
							context: {
								action: AuthorizationContextParamsAction.READ,
								requiredPermissions,
							},
							referenceType: AuthorizationBodyParamsReferenceType.COURSES,
							referenceId: 'someReferenceId',
						},
					],
				};

				const error = new Error('testError');
				authorizationApi.authorizationReferenceControllerAuthorizeByReferences.mockRejectedValueOnce(error);

				return { params, error };
			};

			it('should throw AuthorizationManyReferencesErrorLoggableException', async () => {
				const { params, error } = setup();

				const expectedError = new AuthorizationManyReferencesErrorLoggableException(error, params);

				await expect(service.hasPermissionsByManyReferences(params)).rejects.toThrow(expectedError);
			});
		});

		describe('when isAxiosError returns true', () => {
			const setup = () => {
				const params: AuthorizationManyReferencesBodyParams = {
					references: [
						{
							context: {
								action: AuthorizationContextParamsAction.READ,
								requiredPermissions,
							},
							referenceType: AuthorizationBodyParamsReferenceType.COURSES,
							referenceId: 'someReferenceId',
						},
					],
				};

				const axiosError = new Error('axios error');
				const spyIsAxiosError = jest.spyOn(require('axios'), 'isAxiosError').mockReturnValue(true);

				authorizationApi.authorizationReferenceControllerAuthorizeByReferences.mockRejectedValueOnce(axiosError);

				return { params, axiosError, spyIsAxiosError };
			};

			it('should wrap the error with AxiosErrorLoggable and throw AuthorizationManyReferencesErrorLoggableException', async () => {
				const { params, axiosError, spyIsAxiosError } = setup();

				await expect(service.hasPermissionsByManyReferences(params)).rejects.toThrow(
					AuthorizationManyReferencesErrorLoggableException
				);

				expect(spyIsAxiosError).toHaveBeenCalledWith(axiosError);
				expect(AxiosErrorLoggable).toHaveBeenCalledWith(axiosError, 'AUTHORIZATION_BY_MANY_REFERENCES_FAILED');
			});
		});
	});

	describe('checkPermissionsByManyReferences', () => {
		describe('when authorizationReferenceControllerAuthorizeByReferences resolves successful', () => {
			const setup = (props: { isAuthorized: boolean }) => {
				const params: AuthorizationManyReferencesBodyParams = {
					references: [
						{
							context: {
								action: AuthorizationContextParamsAction.READ,
								requiredPermissions,
							},
							referenceType: AuthorizationBodyParamsReferenceType.COURSES,
							referenceId: 'someReferenceId',
						},
					],
				};

				const response = createMock<AxiosResponse<AuthorizedByReferenceResponse[]>>({
					data: [
						{
							userId: 'userId',
							isAuthorized: props.isAuthorized,
							referenceType: params.references[0].referenceType,
							referenceId: params.references[0].referenceId,
						},
					],
				});
				authorizationApi.authorizationReferenceControllerAuthorizeByReferences.mockResolvedValueOnce(response);

				return { params };
			};

			it('should call authorizationReferenceControllerAuthorizeByReferences with correct params', async () => {
				const { params } = setup({ isAuthorized: true });

				const expectedOptions = { headers: { authorization: `Bearer ${jwtToken}` } };

				await service.checkPermissionsByManyReferences(params);

				expect(authorizationApi.authorizationReferenceControllerAuthorizeByReferences).toHaveBeenCalledWith(
					params,
					expectedOptions
				);
			});

			describe('when permission is granted', () => {
				it('should resolve', async () => {
					const { params } = setup({ isAuthorized: true });

					await expect(service.checkPermissionsByManyReferences(params)).resolves.toBeUndefined();
				});
			});

			describe('when permission is denied', () => {
				it('should throw AuthorizationManyReferencesForbiddenLoggableException', async () => {
					const { params } = setup({ isAuthorized: false });

					const unauthorizedReferences = params.references.map((reference) => ({
						referenceType: reference.referenceType,
						referenceId: reference.referenceId,
						isAuthorized: false,
					}));
					const expectedError = new AuthorizationManyReferencesForbiddenLoggableException(unauthorizedReferences);

					await expect(service.checkPermissionsByManyReferences(params)).rejects.toThrow(expectedError);
				});
			});
		});

		describe('when authorizationReferenceControllerAuthorizeByReferences returns error', () => {
			const setup = () => {
				const params: AuthorizationManyReferencesBodyParams = {
					references: [
						{
							context: {
								action: AuthorizationContextParamsAction.READ,
								requiredPermissions,
							},
							referenceType: AuthorizationBodyParamsReferenceType.COURSES,
							referenceId: 'someReferenceId',
						},
					],
				};

				const error = new Error('testError');
				authorizationApi.authorizationReferenceControllerAuthorizeByReferences.mockRejectedValueOnce(error);

				return { params, error };
			};

			it('should throw AuthorizationManyReferencesErrorLoggableException', async () => {
				const { params, error } = setup();

				const expectedError = new AuthorizationManyReferencesErrorLoggableException(error, params);

				await expect(service.checkPermissionsByManyReferences(params)).rejects.toThrow(expectedError);
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
					tokenTtlInSeconds: 3600,
					payload: {},
				};
				const expectedResponse = createMock<AxiosResponse<AccessTokenResponse>>({
					data: { token: generateNanoId() },
				});

				authorizationApi.authorizationReferenceControllerCreateToken.mockResolvedValueOnce(expectedResponse);

				return { params };
			};

			it('should return AccessTokenResponse', async () => {
				const { params } = setup();

				const result = await service.createToken(params);

				expect(result).toBeInstanceOf(AccessToken);
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
					tokenTtlInSeconds: 3600,
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
					tokenTtlInSeconds: 3600,
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

				const result = await service.resolveToken(token, 3600);

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

				await expect(service.resolveToken(token, 3600)).rejects.toBeInstanceOf(ResolveTokenErrorLoggableException);
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

				await expect(service.resolveToken(token, 3600)).rejects.toThrow(ResolveTokenErrorLoggableException);

				expect(spyIsAxiosError).toHaveBeenCalledWith(axiosError);
				expect(AxiosErrorLoggable).toHaveBeenCalledWith(axiosError, 'RESOLVE_ACCESS_TOKEN_FAILED');
			});
		});
	});
});
