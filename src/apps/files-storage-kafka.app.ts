/* istanbul ignore file */
/* eslint-disable no-console */
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

// register source-map-support for debugging
import { FilesStorageKafkaModule } from '@modules/files-storage-app';
import { install as sourceMapInstall } from 'source-map-support';

async function bootstrap(): Promise<void> {
	sourceMapInstall();

	const app = await NestFactory.createMicroservice<MicroserviceOptions>(FilesStorageKafkaModule, {
		transport: Transport.KAFKA,
		options: {
			client: {
				clientId: 'files-storage',
				brokers: ['localhost:9092'],
			},
			consumer: {
				groupId: 'files-storage-consumer',
			},
		},
	});

	await app.listen();

	console.log('#########################################');
	console.log(`### Start Files Storage Kafka Consumer ###`);
	console.log(`### Listening on Kafka topics          ###`);
	console.log('#########################################');
}
void bootstrap();
