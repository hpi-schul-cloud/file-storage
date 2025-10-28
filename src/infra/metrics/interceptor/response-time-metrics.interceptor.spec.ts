import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Request, Response } from 'express';
import { MetricsService } from '../metrics.service';
import { ResponseTimeMetricsInterceptor } from './response-time-metrics.interceptor';

jest.mock('../metrics.service');

describe(ResponseTimeMetricsInterceptor.name, () => {
	let interceptor: ResponseTimeMetricsInterceptor;
	let mockExecutionContext: DeepMocked<ExecutionContext>;
	let mockCallHandler: DeepMocked<CallHandler>;
	let mockRequest: DeepMocked<Request>;
	let mockResponse: DeepMocked<Response>;

	beforeAll(() => {
		interceptor = new ResponseTimeMetricsInterceptor();
		mockRequest = createMock<Request>();
		mockResponse = createMock<Response>();

		mockExecutionContext = createMock<ExecutionContext>({
			switchToHttp: jest.fn().mockImplementation(() => ({
				getRequest: jest.fn().mockReturnValue(mockRequest),
				getResponse: jest.fn().mockReturnValue(mockResponse),
			})),
		});

		mockCallHandler = createMock<CallHandler>();
	});

	describe('intercept', () => {
		describe('when intercepting a request', () => {
			const setup = () => {
				const expectedLabels = {
					base_url: '',
					full_path: '/test',
					method: 'GET',
					route_path: '/test',
					status_code: 200,
				};

				mockRequest.method = 'GET';
				mockRequest.baseUrl = '';
				mockRequest.route = { path: '/test' };
				mockRequest.url = '/test';
				mockResponse.statusCode = 200;

				return { expectedLabels };
			};

			it('should be defined', () => {
				expect(interceptor).toBeDefined();
			});

			it('should call MetricsService.responseTimeMetricHistogram.observe with correct parameters', () => {
				const { expectedLabels } = setup();

				const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

				expect(MetricsService.responseTimeMetricHistogram.observe).toHaveBeenCalledWith(
					expectedLabels,
					expect.any(Number)
				);
				expect(result).toBeDefined();
			});

			it('should return an observable', () => {
				setup();
				const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

				expect(result).toBeDefined();
			});
		});
	});
});
