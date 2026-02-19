import { AxiosErrorLoggable } from '@infra/error/loggable';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { TypeGuard } from '@shared/guard';
import { Document, DOMParser, Element, LiveNodeList } from '@xmldom/xmldom';
import { isAxiosError } from 'axios';
import { lastValueFrom } from 'rxjs';
import { COLLABORA_CONFIG_TOKEN, CollaboraConfig } from './collabora.config';

@Injectable()
export class CollaboraService {
	constructor(
		@Inject(COLLABORA_CONFIG_TOKEN) private readonly collaboraConfig: CollaboraConfig,
		private readonly httpService: HttpService
	) {}

	public async discoverUrl(mimeType: string): Promise<string> {
		try {
			const xmlDocument = await this.fetchDiscoveryXml();
			const nodes = this.getNodesByMimeType(mimeType, xmlDocument);

			const url = this.getUrlFromFirstNode(nodes);

			return url;
		} catch (error) {
			this.handleDiscoveryError(error);
		}
	}

	private getCollaboraOnlineUrl(): string {
		return this.collaboraConfig.collaboraOnlineUrl;
	}

	private handleDiscoveryError(error: unknown): never {
		if (isAxiosError(error)) {
			error = new AxiosErrorLoggable(error, 'DISCOVERY_SERVER_FAILED');
		}

		throw new InternalServerErrorException('DISCOVERY_SERVER_FAILED', { cause: error });
	}

	private async fetchDiscoveryXml(): Promise<Document> {
		const collaboraOnlineHost = this.getCollaboraOnlineUrl();
		const responseObservable = this.httpService.get(collaboraOnlineHost + '/hosting/discovery', {
			responseType: 'text',
		});
		const response = await lastValueFrom(responseObservable);

		this.checkStatusOk(response.status);

		const xmlDocument = new DOMParser().parseFromString(response.data, 'text/xml');

		return xmlDocument;
	}

	private checkStatusOk(status: number): void {
		if (status !== 200) {
			throw new Error('Request failed. Status Code: ' + status);
		}
	}

	private getNodesByMimeType(mimeType: string, xmlDocument: Document): Element[] {
		const netZone = xmlDocument.getElementsByTagName('net-zone')[0];
		if (!netZone) return [];

		const apps = netZone.getElementsByTagName('app');
		const result = this.getActionsByNameAttribute(apps, mimeType);

		return result;
	}

	private getActionsByNameAttribute(elements: LiveNodeList<Element>, name: string): Element[] {
		const filteredElements = elements
			.filter((element) => element.getAttribute('name') === name)
			.flatMap((element) => {
				const actions = element.getElementsByTagName('action');
				const actionArray = Array.from(actions);

				return actionArray;
			});

		return filteredElements;
	}

	private getUrlFromFirstNode(elements: Element[]): string {
		const validatedElements = TypeGuard.checkArrayWithElements<Element>(elements);
		const firstElement = validatedElements[0];

		const url = firstElement.getAttribute('urlsrc');
		const definedUrl = this.checkUrlIsDefined(url);

		return definedUrl;
	}

	private checkUrlIsDefined(url: string | null): string {
		if (!TypeGuard.isString(url)) {
			throw new Error('The requested mime type is not handled');
		}

		return url;
	}
}
