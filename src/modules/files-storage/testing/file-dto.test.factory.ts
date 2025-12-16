import { DeepPartial } from 'fishery';
import { Readable } from 'node:stream';
import { FileDto, FileDtoFactory } from '../domain';
import {
	aacReadable,
	octetStreamReadable,
	pngReadable,
	svgReadable,
	textReadable,
	tiffReadable,
} from './buffer-with-types';

class FileDtoTestFactory {
	forceStreamError = false;
	props: FileDto = {
		name: `file-dto-name-${Math.random()}`,
		data: Readable.from('abc'),
		mimeType: 'application/octet-stream',
		abortSignal: new AbortController().signal,
		// streamCompletion: Promise.resolve(),
	};

	private static readonly mimeTypeMap = new Map<string, () => Readable>([
		['image/png', pngReadable],
		['text/plain', textReadable],
		['audio/aac', aacReadable],
		['image/tiff', tiffReadable],
		['image/svg+xml', svgReadable],
		['application/octet-stream', octetStreamReadable],
	]);

	public asMimeType(mimeType = this.props.mimeType): FileDtoTestFactory {
		const readableFactory = FileDtoTestFactory.mimeTypeMap.get(mimeType);
		if (!readableFactory) {
			throw new Error(`Mime type ${mimeType} not supported in FileDtoTestFactory`);
		}

		this.props.mimeType = mimeType;
		this.props.data = readableFactory();

		return this;
	}

	public asPng(): FileDtoTestFactory {
		this.props.mimeType = 'image/png';
		this.props.data = pngReadable();

		return this;
	}

	public asText(): FileDtoTestFactory {
		this.props.mimeType = 'text/plain';
		this.props.data = textReadable();

		return this;
	}

	public asAac(): FileDtoTestFactory {
		this.props.mimeType = 'audio/aac';
		this.props.data = aacReadable();

		return this;
	}

	public asTiff(): FileDtoTestFactory {
		this.props.mimeType = 'image/tiff';
		this.props.data = tiffReadable();

		return this;
	}

	public asSvg(): FileDtoTestFactory {
		this.props.mimeType = 'image/svg+xml';
		this.props.data = svgReadable();

		return this;
	}

	public asOctetStream(): FileDtoTestFactory {
		this.props.mimeType = 'application/octet-stream';
		this.props.data = octetStreamReadable();

		return this;
	}

	public withForcedStreamError(): FileDtoTestFactory {
		this.forceStreamError = true;

		return this;
	}

	public build(params: DeepPartial<FileDto> = {}): FileDto {
		const props = { ...this.props, ...params };
		const data = params.data ?? props.data;
		const abortSignal = params.abortSignal ?? props.abortSignal;

		const fileDto = FileDtoFactory.create(
			params.name ?? props.name,
			data as Readable,
			params.mimeType ?? props.mimeType,
			abortSignal as AbortSignal
		);

		if (this.forceStreamError) {
			// fileDto.streamCompletion = Promise.reject(new Error('Stream processing failed'));
		}

		return fileDto;
	}
}

export const fileDtoTestFactory = (): FileDtoTestFactory => new FileDtoTestFactory();
