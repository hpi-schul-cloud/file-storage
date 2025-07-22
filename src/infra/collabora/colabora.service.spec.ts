import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AxiosErrorLoggable } from '@infra/error/loggable';
import { HttpService } from '@nestjs/axios';
import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { axiosResponseFactory } from '@testing/factory/axios-response.factory';
import { AxiosError } from 'axios';
import { of, throwError } from 'rxjs';
import { CollaboraConfig } from './colabora.config';
import { CollaboraService } from './colabora.service';

describe('CollaboraService', () => {
	describe('CollaboraService', () => {
		let service: CollaboraService;
		let collaboraConfig: DeepMocked<CollaboraConfig>;
		let httpService: DeepMocked<HttpService>;
		let module: TestingModule;

		afterEach(() => {
			jest.resetAllMocks();
		});

		beforeAll(async () => {
			collaboraConfig = createMock<CollaboraConfig>();
			httpService = createMock<HttpService>();

			module = await Test.createTestingModule({
				providers: [
					CollaboraService,
					{ provide: HttpService, useValue: httpService },
					{ provide: CollaboraConfig, useValue: collaboraConfig },
				],
			}).compile();

			service = module.get(CollaboraService);
		});

		afterAll(async () => {
			await module.close();
		});

		describe('discoverUrl', () => {
			describe('when httpService.get resolves', () => {
				describe('when status is 200', () => {
					const setup = () => {
						const mimeType = 'application/vnd.oasis.opendocument.text';
						const urlsrc = 'https://collabora.test/hosting/discovery';
						const xmlString = `<wopi-discovery><net-zone><app name='${mimeType}'><action urlsrc='${urlsrc}'/></app></net-zone></wopi-discovery>`;
						const response = axiosResponseFactory.build({ data: xmlString, status: 200 });

						collaboraConfig.COLLABORA_ONLINE_URL = 'https://collabora.test';
						httpService.get.mockReturnValueOnce(of(response));

						return {
							mimeType,
							urlsrc,
						};
					};

					it('should return the discovery url for the given mimeType', async () => {
						const { mimeType, urlsrc } = setup();

						const result = await service.discoverUrl(mimeType);

						expect(result).toBe(urlsrc);
					});
				});

				describe('when status is not 200', () => {
					const setup = () => {
						const mimeType = 'application/vnd.oasis.opendocument.text';
						const response = axiosResponseFactory.build({ data: '', status: 404 });
						const error = new Error('Request failed. Status Code: 404');

						collaboraConfig.COLLABORA_ONLINE_URL = 'https://collabora.test';
						httpService.get.mockReturnValueOnce(of(response));

						return {
							mimeType,
							error,
						};
					};

					it('should throw InternalServerErrorException when discovery fails', async () => {
						const { mimeType, error } = setup();

						await expect(service.discoverUrl(mimeType)).rejects.toThrow(
							new InternalServerErrorException('DISCOVERY_SERVER_FAILED', { cause: error })
						);
					});
				});

				describe('when response data is not a valid XML', () => {
					const setup = () => {
						const mimeType = 'application/vnd.oasis.opendocument.text';
						const response = axiosResponseFactory.build({ data: 'Invalid XML', status: 200 });
						const error = new Error('missing root element');

						collaboraConfig.COLLABORA_ONLINE_URL = 'https://collabora.test';
						httpService.get.mockReturnValueOnce(of(response));

						return {
							mimeType,
							error,
						};
					};

					it('should throw InternalServerErrorException when discovery fails', async () => {
						const { mimeType, error } = setup();

						await expect(service.discoverUrl(mimeType)).rejects.toThrow(
							new InternalServerErrorException('DISCOVERY_SERVER_FAILED', { cause: error })
						);
					});
				});

				describe('when response data is not containing action with mimetype', () => {
					const setup = () => {
						const mimeType = 'application/vnd.oasis.opendocument.text';
						const xmlString = `<wopi-discovery><net-zone><app name='not-a-mimetype'><action urlsrc='https://collabora.test/hosting/discovery'/></app></net-zone></wopi-discovery>`;
						const response = axiosResponseFactory.build({ data: xmlString, status: 200 });
						const error = new Error('Type is not an array with elements.');

						collaboraConfig.COLLABORA_ONLINE_URL = 'https://collabora.test';
						httpService.get.mockReturnValueOnce(of(response));

						return {
							mimeType,
							error,
						};
					};

					it('should throw InternalServerErrorException when discovery fails', async () => {
						const { mimeType, error } = setup();

						await expect(service.discoverUrl(mimeType)).rejects.toThrow(
							new InternalServerErrorException('DISCOVERY_SERVER_FAILED', { cause: error })
						);
					});
				});

				describe('when response data is not containing url', () => {
					const setup = () => {
						const mimeType = 'application/vnd.oasis.opendocument.text';
						const xmlString = `<wopi-discovery><net-zone><app name='${mimeType}'><action/></app></net-zone></wopi-discovery>`;
						const response = axiosResponseFactory.build({ data: xmlString, status: 200 });
						const error = new Error('The requested mime type is not handled');

						collaboraConfig.COLLABORA_ONLINE_URL = 'https://collabora.test';
						httpService.get.mockReturnValueOnce(of(response));

						return {
							mimeType,
							error,
						};
					};

					it('should throw InternalServerErrorException when discovery fails', async () => {
						const { mimeType, error } = setup();

						await expect(service.discoverUrl(mimeType)).rejects.toThrow(
							new InternalServerErrorException('DISCOVERY_SERVER_FAILED', { cause: error })
						);
					});
				});
			});

			describe('when getDiscoveryUrl rejects', () => {
				describe('when error is not axios error', () => {
					const setup = () => {
						const mimeType = 'application/vnd.oasis.opendocument.text';
						const error = new Error('Request failed');

						collaboraConfig.COLLABORA_ONLINE_URL = 'https://collabora.test';
						httpService.get.mockReturnValueOnce(throwError(() => error));

						return {
							mimeType,
							error,
						};
					};

					it('should throw InternalServerErrorException when discovery fails', async () => {
						const { mimeType, error } = setup();

						await expect(service.discoverUrl(mimeType)).rejects.toThrow(
							new InternalServerErrorException('DISCOVERY_SERVER_FAILED', { cause: error })
						);
					});
				});

				describe('when error is axios error', () => {
					const setup = () => {
						const mimeType = 'application/vnd.oasis.opendocument.text';
						const error = new AxiosError();

						collaboraConfig.COLLABORA_ONLINE_URL = 'https://collabora.test';
						httpService.get.mockReturnValueOnce(throwError(() => error));

						return {
							mimeType,
							error,
						};
					};

					it('should throw InternalServerErrorException with AxiosErrorLoggable', async () => {
						const { mimeType, error } = setup();

						const axiosErrorLoggable = new AxiosErrorLoggable(error, 'DISCOVERY_SERVER_FAILED');
						await expect(service.discoverUrl(mimeType)).rejects.toThrow(
							new InternalServerErrorException('DISCOVERY_SERVER_FAILED', { cause: axiosErrorLoggable })
						);
					});
				});
			});
		});
	});
});
