import { Algorithm } from 'jsonwebtoken';

export interface JwtAuthGuardConfig {
	JWT_PUBLIC_KEY: string;
	JWT_SIGNING_ALGORITHM: Algorithm;
	JWT_DOMAIN: string;
}
