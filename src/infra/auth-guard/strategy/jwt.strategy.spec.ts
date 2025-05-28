import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuardConfig } from '../auth-guard.config';
import { jwtPayloadFactory } from '../testing';
import { JwtStrategy } from './jwt.strategy';

describe('jwt strategy', () => {
	let strategy: JwtStrategy;
	let module: TestingModule;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			providers: [
				JwtStrategy,
				{
					provide: AuthGuardConfig,
					useValue: createMock<AuthGuardConfig>(),
				},
			],
		}).compile();

		strategy = module.get(JwtStrategy);
	});

	afterAll(async () => {
		await module.close();
	});

	it('should be defined', () => {
		expect(strategy).toBeDefined();
	});

	describe('when authenticate a user with jwt', () => {
		const setup = () => {
			const mockJwtPayload = jwtPayloadFactory.build();

			return {
				mockJwtPayload,
			};
		};

		it('should return user', async () => {
			const { mockJwtPayload } = setup();
			const user = await strategy.validate(mockJwtPayload);
			expect(user).toMatchObject({
				userId: mockJwtPayload.userId,
				roles: [mockJwtPayload.roles[0]],
				schoolId: mockJwtPayload.schoolId,
				accountId: mockJwtPayload.accountId,
				systemId: mockJwtPayload.systemId,
				support: mockJwtPayload.support,
			});
		});
	});
});
