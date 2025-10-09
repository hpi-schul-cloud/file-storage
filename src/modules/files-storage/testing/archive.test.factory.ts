import { Logger } from '@infra/logger';
import archiver from 'archiver';
import { PassThrough } from 'node:stream';
import { FileRecord } from '../domain';
import { ArchiveFactory } from '../domain/factory';

const createFileResponse = (name: string, content: string): { name: string; data: PassThrough } => {
	const stream = new PassThrough();
	stream.end(content);

	return { name, data: stream };
};

/**
 * const archive = ArchiveTestFactory.build(done);
 * archive.on('close', () => {
 *		expect(..);
 *		done();
 *	});
 */
export class ArchiveTestFactory {
	public static build(done: (err?: unknown) => void, chunks: Buffer[] = [], logger?: Logger): archiver.Archiver {
		const files = [createFileResponse('file1.txt', 'hello'), createFileResponse('file2.txt', 'world')];
		const fileRecords: FileRecord[] = [];
		const archive = ArchiveFactory.create(files, fileRecords, logger, 'zip');

		archive.on('data', (chunk) => chunks.push(chunk));
		archive.on('error', (err) => done(err));

		return archive;
	}
}
