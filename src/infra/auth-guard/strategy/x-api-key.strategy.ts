import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import Strategy from 'passport-headerapikey';
import { StrategyType } from '../interface';
import { XApiKeyConfig } from '../x-api-key.config';

@Injectable()
export class XApiKeyStrategy extends PassportStrategy(Strategy, StrategyType.API_KEY) {
	private readonly allowedApiKeys: string[];

	constructor(private readonly config: XApiKeyConfig) {
		super(
			{
				header: 'X-API-KEY',
				prefix: '',
			},
			false
		);
		this.allowedApiKeys = this.config.X_API_ALLOWED_KEYS;
	}

	public validate = (apiKey: string, done: (error: Error | null, data: boolean | null) => void): void => {
		if (this.allowedApiKeys.includes(apiKey)) {
			done(null, true);
		}
		done(new UnauthorizedException(), null);
	};
}
