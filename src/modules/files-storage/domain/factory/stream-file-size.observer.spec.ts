import { Readable } from 'stream';
import { StreamFileSizeObserver } from './stream-file-size.observer';

describe('StreamFileSizeObserver', () => {
	describe('create', () => {
		const setup = () => {
			const stream = new Readable({
				read() {
					this.push(null);
				},
			});
			const observer = StreamFileSizeObserver.create(stream);

			return {
				stream,
				observer,
			};
		};

		it('should initialize fileSize to 0', () => {
			const { observer } = setup();

			const result = observer.getFileSize();

			expect(result).toBe(0);
		});

		it('should accumulate fileSize as data is streamed', () => {
			const { stream, observer } = setup();

			const chunk1 = Buffer.from('abc');
			const chunk2 = Buffer.from('defg');

			stream.emit('data', chunk1);
			stream.emit('data', chunk2);

			const result = observer.getFileSize();

			expect(result).toBe(chunk1.length + chunk2.length);
		});
	});

	describe('getFileSize', () => {
		const setup = () => {
			const stream = new Readable({
				read() {
					this.push(null);
				},
			});
			const observer = StreamFileSizeObserver.create(stream);
			const chunk = Buffer.from('test');

			stream.emit('data', chunk);

			return {
				observer,
				chunk,
			};
		};

		it('should return the correct file size after data events', () => {
			const { observer, chunk } = setup();

			const result = observer.getFileSize();

			expect(result).toBe(chunk.length);
		});
	});
});
