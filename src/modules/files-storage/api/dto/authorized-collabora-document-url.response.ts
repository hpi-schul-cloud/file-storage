/* eslint-disable max-classes-per-file */
import { ApiProperty } from '@nestjs/swagger';

export class AuthorizedCollaboraDocumentUrlResponse {
	constructor(props: AuthorizedCollaboraDocumentUrlResponse) {
		this.authorizedCollaboraDocumentUrl = props.authorizedCollaboraDocumentUrl;
	}

	@ApiProperty()
	authorizedCollaboraDocumentUrl: string;
}
