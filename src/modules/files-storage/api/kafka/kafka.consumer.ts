import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

@Controller()
export class KafkaConsumer {
	@EventPattern('test-topic')
	public deleteFile(@Payload() message: unknown): void {
		console.log('Received event on test-topic:', JSON.stringify(message));
	}
}
