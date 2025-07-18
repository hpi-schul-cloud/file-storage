import { AxiosErrorLoggable } from '@infra/error/loggable';
import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DOMParser } from '@xmldom/xmldom';
import { isAxiosError } from 'axios';
import { lastValueFrom } from 'rxjs';
import * as xpath from 'xpath';
import { CollaboraConfig } from './colabora.config';

@Injectable()
export class CollaboraService {
	constructor(
		private readonly collaboraConfig: CollaboraConfig,
		private readonly httpService: HttpService
	) {}

	public getCollaboraOnlineUrl(): string {
		return this.collaboraConfig.COLLABORA_ONLINE_URL;
	}

	public async getDiscoveryUrl(mimeType: string): Promise<string> {
		const collaboraOnlineHost = this.getCollaboraOnlineUrl();

		try {
			const response = await lastValueFrom(
				this.httpService.get(collaboraOnlineHost + '/hosting/discovery', { responseType: 'text' })
			);
			const { data } = response;
			if (response.status !== 200) {
				throw new Error('Request failed. Status Code: ' + response.status);
			}
			const doc = new DOMParser().parseFromString(data, 'text/xml');

			if (!doc) {
				throw new Error('The retrieved discovery.xml file is not a valid XML file');
			}

			const nodes = xpath.select(`/wopi-discovery/net-zone/app[@name='${mimeType}']/action`, doc as any);

			if (Array.isArray(nodes) && nodes.length === 1) {
				const onlineUrl = (nodes[0] as Element).getAttribute('urlsrc');
				if (!onlineUrl) {
					throw new Error('The requested mime type is not handled');
				}

				return onlineUrl;
			} else {
				throw new Error('The requested mime type is not handled');
			}
		} catch (error) {
			if (isAxiosError(error)) {
				error = new AxiosErrorLoggable(error, 'DISCOVERY_SERVER_FAILED');
			}

			throw new InternalServerErrorException('DISCOVERY_SERVER_FAILED', { cause: error });
		}
	}
}
