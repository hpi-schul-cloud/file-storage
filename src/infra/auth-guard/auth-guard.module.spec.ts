import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuardModule, AuthGuardOptions } from './auth-guard.module';
import { JwtStrategy, XApiKeyStrategy } from './strategy';

describe('AuthGuardModule', () => {
	let module: TestingModule;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [AuthGuardModule.register([AuthGuardOptions.JWT, AuthGuardOptions.X_API_KEY])],
		}).compile();
	});

	it('should be defined', () => {
		expect(module).toBeDefined();
	});

	it('should contain JwtStrategy provider', () => {
		const jwtStrategy = module.get(JwtStrategy, { strict: false });
		expect(jwtStrategy).toBeDefined();
	});

	it('should contain XApiKeyStrategy provider', () => {
		const xApiKeyStrategy = module.get(XApiKeyStrategy, { strict: false });
		expect(xApiKeyStrategy).toBeDefined();
	});
});
