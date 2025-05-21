import { Logger } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { createRequestLoggerMiddleware } from './request-logger-middleware';

describe('RequestLoggerMiddleware', () => {
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	let nextFunction: NextFunction;
	let loggerSpy: jest.SpyInstance;
	let errorLoggerSpy: jest.SpyInstance;

	beforeEach(() => {
		mockRequest = {
			method: 'GET',
			originalUrl: '/test',
		};

		mockResponse = {
			statusCode: 200,
			get: jest.fn(),
			on: jest.fn(),
		};

		nextFunction = jest.fn();

		loggerSpy = jest.spyOn(Logger.prototype, 'log');
		errorLoggerSpy = jest.spyOn(Logger.prototype, 'error');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should call next() when logging is disabled', () => {
		const middleware = createRequestLoggerMiddleware(false);
		middleware(mockRequest as Request, mockResponse as Response, nextFunction);

		expect(nextFunction).toHaveBeenCalled();
		expect(mockResponse.on).not.toHaveBeenCalled();
	});

	it('should log request details when logging is enabled', () => {
		jest.spyOn(process, 'hrtime').mockReturnValueOnce([0, 0]);
		jest.spyOn(mockResponse, 'get').mockImplementation().mockReturnValue('100');

		let finishCallback: Function | undefined;
		jest.spyOn(mockResponse, 'on').mockImplementation((_event: string, callback: Function) => {
			finishCallback = callback;
		});

		const middleware = createRequestLoggerMiddleware(true);
		middleware(mockRequest as Request, mockResponse as Response, nextFunction);

		expect(nextFunction).toHaveBeenCalled();
		expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));

		// Simulate response finish
		jest.spyOn(process, 'hrtime').mockReturnValueOnce([1, 0]);

		// Make sure callback was set before calling it
		expect(finishCallback).toBeDefined();
		finishCallback?.();

		expect(loggerSpy).toHaveBeenCalledWith('GET /test 200 1000ms 100');
	});

	it('should handle errors during logging', () => {
		jest.spyOn(mockResponse, 'on').mockImplementation((event: string, callback: Function) => {
			callback();
		});

		// Force an error by making response.get throw
		jest.spyOn(mockResponse, 'get').mockImplementation(() => {
			throw new Error('Test error');
		});

		const middleware = createRequestLoggerMiddleware(true);
		middleware(mockRequest as Request, mockResponse as Response, nextFunction);

		expect(errorLoggerSpy).toHaveBeenCalledWith('unable to write accesslog', Error('Test error'));
	});
});
