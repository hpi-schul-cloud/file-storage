import { AxiosErrorLoggable } from '@infra/error/loggable';
import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { TypeGuard } from '@shared/guard';
import { Document, DOMParser } from '@xmldom/xmldom';
import { isAxiosError } from 'axios';
import { lastValueFrom } from 'rxjs';
import * as xpath from 'xpath';
import { CollaboraConfig } from './collabora.config';

@Injectable()
export class CollaboraService {
	constructor(
		private readonly collaboraConfig: CollaboraConfig,
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
		return this.collaboraConfig.COLLABORA_ONLINE_URL;
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

		const doc = new DOMParser().parseFromString(response.data, 'text/xml');

		return doc;
	}

	private checkStatusOk(status: number): void {
		if (status !== 200) {
			throw new Error('Request failed. Status Code: ' + status);
		}
	}

	private getNodesByMimeType(mimeType: string, doc: Document): xpath.SelectReturnType {
		const nodes = xpath.select(`/wopi-discovery/net-zone/app[@name='${mimeType}']/action`, doc as unknown as Node);

		return nodes;
	}

	private getUrlFromFirstNode(nodes: xpath.SelectReturnType): string {
		const validatedNodes = TypeGuard.checkArrayWithElements<Element>(nodes);
		const firstElement = validatedNodes[0];

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
