import { AxiosHeaderValue, AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { BaseFactory } from './base.factory';

export type AxiosHeadersKeyValue = Record<string, AxiosHeaderValue>;
interface AxiosResponseProps<T> {
	data: T;
	status: number;
	statusText: string;
	headers: AxiosHeadersKeyValue;
	config: InternalAxiosRequestConfig<unknown>;
}

class AxiosResponseImp<T> implements AxiosResponse {
	public data: T;

	public status: number;

	public statusText: string;

	public headers: AxiosHeaders;

	public config: InternalAxiosRequestConfig<unknown>;

	constructor(props: AxiosResponseProps<T>) {
		this.data = props.data;
		this.status = props.status;
		this.statusText = props.statusText;
		this.headers = new AxiosHeaders(props.headers);
		this.config = props.config;
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const axiosResponseFactory = BaseFactory.define<AxiosResponseImp<any>, AxiosResponseProps<any>>(
	AxiosResponseImp,
	() => {
		return {
			data: '',
			status: 200,
			statusText: '',
			headers: new AxiosHeaders(),
			config: { headers: new AxiosHeaders() },
		};
	}
);
