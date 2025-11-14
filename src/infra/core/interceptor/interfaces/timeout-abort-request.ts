import { Request } from 'express';

export interface TimeoutAbortRequest extends Request {
	timeoutAbortController?: AbortController;
}
