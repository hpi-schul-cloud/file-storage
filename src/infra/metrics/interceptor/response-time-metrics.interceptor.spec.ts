import { createMock } from '@golevelup/ts-jest';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Request, Response } from 'express';
import { MetricsService } from '../metrics.service';
import { ResponseTimeMetricsInterceptor } from './response-time-metrics.interceptor';

jest.mock('../metrics.service');

describe(ResponseTimeMetricsInterceptor.name, () => {
	describe('intercept', () => {
		describe('when intercepting a request', () => {
			const setup = () => {
				const interceptor = new ResponseTimeMetricsInterceptor();
				const mockRequest = createMock<Request>({
					method: 'GET',
					baseUrl: '',
					route: { path: '/test' },
					url: '/test',
				});
				const mockResponse = createMock<Response>({
					statusCode: 200,
				});
				const mockExecutionContext = createMock<ExecutionContext>({
					switchToHttp: jest.fn().mockImplementation(() => ({
						getRequest: jest.fn().mockReturnValue(mockRequest),
						getResponse: jest.fn().mockReturnValue(mockResponse),
					})),
				});
				const mockCallHandler = createMock<CallHandler>();

				const expectedLabels = {
					base_url: '',
					full_path: '/test',
					method: 'GET',
					route_path: '/test',
					status_code: 200,
				};

				return { expectedLabels, interceptor, mockExecutionContext, mockCallHandler };
			};

			it('should be defined', () => {
				const { interceptor } = setup();

				expect(interceptor).toBeDefined();
			});

			it('should call MetricsService.responseTimeMetricHistogram.observe with correct parameters', () => {
				const { expectedLabels, interceptor, mockExecutionContext, mockCallHandler } = setup();

				const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

				expect(MetricsService.responseTimeMetricHistogram.observe).toHaveBeenCalledWith(
					expectedLabels,
					expect.any(Number)
				);
				expect(result).toBeDefined();
			});

			it('should return an observable', () => {
				const { interceptor, mockExecutionContext, mockCallHandler } = setup();
				const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

				expect(result).toBeDefined();
			});
		});
	});
});
