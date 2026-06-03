import { _Error } from '@aws-sdk/client-s3';
import { Factory } from 'fishery';

export const createS3Error = Factory.define<_Error>(() => {
	return {
		Key: undefined,
		Code: 'AccessDenied',
		Message: 'Access denied',
	};
});
