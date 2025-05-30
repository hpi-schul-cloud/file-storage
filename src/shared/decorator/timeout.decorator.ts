import { applyDecorators, SetMetadata } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function RequestTimeout(requestTimeoutEnvironmentName: string) {
	return applyDecorators(SetMetadata('requestTimeoutEnvironmentName', requestTimeoutEnvironmentName));
}
