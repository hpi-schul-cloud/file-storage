import { DeepPartial } from 'fishery';
import { Readable } from 'node:stream';
import { FileDto, FileDtoFactory } from '../domain';

class FileDtoTestFactory {
	props: FileDto = {
		name: `file-dto-name-${Math.random()}`,
		data: Readable.from('abc'),
		mimeType: 'application/octet-stream',
	};

	public build(params: DeepPartial<FileDto> = {}): FileDto {
		const props = { ...this.props, ...params };
		const data = params.data ?? props.data;

		const fileDto = FileDtoFactory.create(
			params.name ?? props.name,
			data as Readable,
			params.mimeType ?? props.mimeType
		);

		return fileDto;
	}
}

export const fileDtoTestFactory = (): FileDtoTestFactory => new FileDtoTestFactory();
