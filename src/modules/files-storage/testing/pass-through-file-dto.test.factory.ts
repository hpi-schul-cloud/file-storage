import { DeepPartial } from 'fishery';
import { PassThrough, Readable } from 'node:stream';
import { FileDto, FileDtoFactory } from '../domain';
import { PassThroughFileDto } from '../domain/dto';
import { PassThroughFileDtoFactory } from '../domain/factory';
import {
	aacReadable,
	octetStreamReadable,
	pngReadable,
	svgReadable,
	textReadable,
	tiffReadable,
} from './buffer-with-types';

class PassThroughFileDtoTestFactory {
	forceStreamError = false;
	props: FileDto = {
		name: `file-dto-name-${Math.random()}`,
		data: Readable.from('abc').pipe(new PassThrough()),
		mimeType: 'application/octet-stream',
		abortSignal: new AbortController().signal,
	};

	private static readonly mimeTypeMap = new Map<string, () => Readable>([
		['image/png', pngReadable],
		['text/plain', textReadable],
		['audio/aac', aacReadable],
		['image/tiff', tiffReadable],
		['image/svg+xml', svgReadable],
		['application/octet-stream', octetStreamReadable],
	]);

	public asMimeType(mimeType = this.props.mimeType): PassThroughFileDtoTestFactory {
		const readableFactory = PassThroughFileDtoTestFactory.mimeTypeMap.get(mimeType);
		if (!readableFactory) {
			throw new Error(`Mime type ${mimeType} not supported in FileDtoTestFactory`);
		}

		this.props.mimeType = mimeType;
		this.props.data = readableFactory();

		return this;
	}

	public asPng(): this {
		this.props.mimeType = 'image/png';
		this.props.data = pngReadable();

		return this;
	}

	public asText(): this {
		this.props.mimeType = 'text/plain';
		this.props.data = textReadable();

		return this;
	}

	public asAac(): this {
		this.props.mimeType = 'audio/aac';
		this.props.data = aacReadable();

		return this;
	}

	public asTiff(): this {
		this.props.mimeType = 'image/tiff';
		this.props.data = tiffReadable();

		return this;
	}

	public asSvg(): this {
		this.props.mimeType = 'image/svg+xml';
		this.props.data = svgReadable();

		return this;
	}

	public asOctetStream(): this {
		this.props.mimeType = 'application/octet-stream';
		this.props.data = octetStreamReadable();

		return this;
	}

	public withForcedStreamError(): this {
		this.forceStreamError = true;

		return this;
	}

	public build(params: DeepPartial<FileDto> = {}): PassThroughFileDto {
		const props = { ...this.props, ...params };
		const data = (params.data ?? props.data) as Readable;
		const abortSignal = params.abortSignal ?? props.abortSignal;

		const fileDto = FileDtoFactory.create(
			params.name ?? props.name,
			data,
			params.mimeType ?? props.mimeType,
			abortSignal as AbortSignal
		);

		const passThrough = data.pipe(new PassThrough());
		const passThroughFileDto = PassThroughFileDtoFactory.create(
			fileDto,
			passThrough,
			params.mimeType ?? props.mimeType
		);

		if (this.forceStreamError) {
			passThroughFileDto.streamCompletion = Promise.reject(new Error('Stream processing failed'));
		}

		return passThroughFileDto;
	}
}

export const passThroughFileDtoTestFactory = (): PassThroughFileDtoTestFactory => new PassThroughFileDtoTestFactory();
