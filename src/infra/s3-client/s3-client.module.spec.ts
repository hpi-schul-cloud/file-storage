import { createMock } from '@golevelup/ts-jest';
import { Logger } from '@infra/logger';
import { Inject } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { S3ClientAdapter } from './s3-client.adapter';
import { S3ClientModule } from './s3-client.module';

const connectionOne = 'connectionOne';

class OneService {
	constructor(@Inject(connectionOne) public s3client: S3ClientAdapter) {}
}

describe('S3ClientModule', () => {
	let module: TestingModule;
	const s3ClientConfigOne = {
		connectionName: connectionOne,
		endpoint: 'endpoint-1',
		region: 'region-eu-2',
		bucket: 'bucket-1',
		accessKeyId: 'accessKeyId-1',
		secretAccessKey: 'secretAccessKey-1',
	};

	let s3ClientAdapterOne: S3ClientAdapter;
	let serviceOne: OneService;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [
				S3ClientModule.register(connectionOne, s3ClientConfigOne),
				ConfigModule.forRoot({ ignoreEnvFile: true, ignoreEnvVars: true, isGlobal: true }),
			],
			providers: [
				{
					provide: Logger,
					useValue: createMock<Logger>(),
				},
				OneService,
			],
		}).compile();

		s3ClientAdapterOne = module.get(connectionOne);
		serviceOne = module.get(OneService);
	});

	afterAll(async () => {
		await module.close();
	});

	describe('when connectionOne is initialized with register method', () => {
		it('should be defined', () => {
			expect(s3ClientAdapterOne).toBeDefined();
		});

		it('should has correctly connection', () => {
			// @ts-expect-error this is a private property
			expect(s3ClientAdapterOne.config).toBe(s3ClientConfigOne);
		});
	});

	describe('OneService', () => {
		describe('when connectionOne is injected', () => {
			it('should has injected s3ClientAdapterOne', () => {
				expect(serviceOne.s3client).toBe(s3ClientAdapterOne);
			});
		});
	});
});
