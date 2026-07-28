import { type NextFunction, type Request, type Response } from 'express';

export const createDisableKeepAliveMiddleware = (): ((
	request: Request,
	response: Response,
	next: NextFunction
) => void) => {
	return (_request: Request, response: Response, next: NextFunction): void => {
		response.setHeader('Connection', 'close');
		next();
	};
};
