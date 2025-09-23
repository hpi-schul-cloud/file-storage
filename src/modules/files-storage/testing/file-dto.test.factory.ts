import { DeepPartial } from 'fishery';
import { Readable } from 'stream';
import { FileDtoMapper } from '../api/mapper';
import { FileDto } from '../domain';

class FileDtoTestFactory {
	props: FileDto = {
		name: `file-dto-name-${Math.random()}`,
		data: Readable.from('abc'),
		mimeType: 'application/octet-stream',
	};

	public build(params: DeepPartial<FileDto> = {}): FileDto {
		const props = { ...this.props, ...params };
		const data = params.data ?? props.data;

		const fileDto = FileDtoMapper.build(params.name ?? props.name, data as Readable, params.mimeType ?? props.mimeType);

		return fileDto;
	}
}

export const fileDtoTestFactory = (): FileDtoTestFactory => new FileDtoTestFactory();
