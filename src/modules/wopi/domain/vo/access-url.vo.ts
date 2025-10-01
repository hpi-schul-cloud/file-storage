import { ValueObject } from '@shared/domain/value-object.decorator';
import { Matches } from 'class-validator';

@ValueObject()
export class AuthorizedCollaboraDocumentUrl {
	constructor(url: string) {
		this.url = url;
	}

	@Matches(/WOPISrc=([^&]+)&access_token=([^&]+)/)
	public readonly url: string;
}
