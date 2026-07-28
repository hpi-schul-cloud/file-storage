import { type NextFunction, type Request, type Response } from 'express';
import { createDisableKeepAliveMiddleware } from './disable-keep-alive-middleware';

describe('DisableKeepAliveMiddleware', () => {
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	let nextFunction: NextFunction;

	beforeEach(() => {
		mockRequest = {};
		mockResponse = {
			setHeader: jest.fn(),
		};
		nextFunction = jest.fn();
	});

	it('should disable keep-alive for every response', () => {
		const middleware = createDisableKeepAliveMiddleware();

		middleware(mockRequest as Request, mockResponse as Response, nextFunction);

		expect(mockResponse.setHeader).toHaveBeenCalledWith('Connection', 'close');
		expect(nextFunction).toHaveBeenCalled();
	});
});
