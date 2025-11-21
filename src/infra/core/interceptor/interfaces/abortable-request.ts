import { Request } from 'express';

export interface AbortableRequest extends Request {
	abortController?: AbortController;
}
