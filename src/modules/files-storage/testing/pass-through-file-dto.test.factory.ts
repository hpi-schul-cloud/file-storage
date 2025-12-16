import { DeepPartial } from 'fishery';
import { PassThrough } from 'node:stream';
import { FileDto } from '../domain';
import { PassThroughFileDto } from '../domain/dto';
import { PassThroughFileDtoFactory } from '../domain/factory';
import { fileDtoTestFactory } from './file-dto.test.factory';

class PassThroughFileDtoTestFactory {
	private fileDtoFactory = fileDtoTestFactory();
	forceStreamError = false;

	public asMimeType(mimeType?: string): this {
		this.fileDtoFactory.asMimeType(mimeType);

		return this;
	}

	public asPng(): this {
		this.fileDtoFactory.asPng();

		return this;
	}

	public asText(): this {
		this.fileDtoFactory.asText();

		return this;
	}

	public asAac(): this {
		this.fileDtoFactory.asAac();

		return this;
	}

	public asTiff(): this {
		this.fileDtoFactory.asTiff();

		return this;
	}

	public asSvg(): this {
		this.fileDtoFactory.asSvg();

		return this;
	}

	public asOctetStream(): this {
		this.fileDtoFactory.asOctetStream();

		return this;
	}

	public withForcedStreamError(): this {
		this.forceStreamError = true;

		return this;
	}

	public build(params: DeepPartial<FileDto> = {}): PassThroughFileDto {
		// Erstelle das FileDto mit der fileDtoFactory
		const fileDto = this.fileDtoFactory.build(params);

		// Dann der PassThrough-spezifische Code
		const passThrough = fileDto.data.pipe(new PassThrough());
		const passThroughFileDto = PassThroughFileDtoFactory.create(fileDto, passThrough, fileDto.mimeType);

		if (this.forceStreamError) {
			passThroughFileDto.streamCompletion = Promise.reject(new Error('Stream processing failed'));
		}

		return passThroughFileDto;
	}
}

export const passThroughFileDtoTestFactory = (): PassThroughFileDtoTestFactory => new PassThroughFileDtoTestFactory();
