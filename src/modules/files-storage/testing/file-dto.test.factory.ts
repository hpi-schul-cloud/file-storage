import { DeepPartial } from 'fishery';
import { Readable } from 'node:stream';
import { FileDto, FileDtoFactory, StreamFileSizeObserver } from '../domain';
import { aacReadable, pngReadable, textReadable, tiffReadable } from './buffer-with-types';

class FileDtoTestFactory {
	props: FileDto = {
		name: `file-dto-name-${Math.random()}`,
		data: Readable.from('abc'),
		mimeType: 'application/octet-stream',
		abortSignal: new AbortController().signal,
		streamCompletion: Promise.resolve(),
		fileSizeObserver: StreamFileSizeObserver.create(Readable.from('abc')),
	};

	public asPng(): FileDtoTestFactory {
		this.props.mimeType = 'image/png';
		this.props.data = pngReadable();
		this.props.fileSizeObserver = StreamFileSizeObserver.create(this.props.data);

		return this;
	}

	public asText(): FileDtoTestFactory {
		this.props.mimeType = 'text/plain';
		this.props.data = textReadable();
		this.props.fileSizeObserver = StreamFileSizeObserver.create(this.props.data);

		return this;
	}

	public asAac(): FileDtoTestFactory {
		this.props.mimeType = 'audio/aac';
		this.props.data = aacReadable();
		this.props.fileSizeObserver = StreamFileSizeObserver.create(this.props.data);

		return this;
	}

	public asTiff(): FileDtoTestFactory {
		this.props.mimeType = 'image/tiff';
		this.props.data = tiffReadable();
		this.props.fileSizeObserver = StreamFileSizeObserver.create(this.props.data);

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

		return fileDto;
	}
}

export const fileDtoTestFactory = (): FileDtoTestFactory => new FileDtoTestFactory();
