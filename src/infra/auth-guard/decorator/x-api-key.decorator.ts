import { applyDecorators, UseGuards } from '@nestjs/common';
import { XApiKeyGuard } from '../guard';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export const XApiKeyAuthentication = () => {
	const decorator = applyDecorators(UseGuards(XApiKeyGuard));

	return decorator;
};
