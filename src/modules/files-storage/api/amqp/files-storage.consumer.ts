import { RabbitPayload, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { Logger } from '@infra/logger';
import { RpcMessage } from '@infra/rabbitmq';
import { CreateRequestContext, MikroORM } from '@mikro-orm/mongodb';
import { FileStorageActionsLoggable } from '@modules/files-storage/domain/loggable';
import { Injectable } from '@nestjs/common';
import { EntityId } from '@shared/domain/types';
import { FilesStorageService, PreviewService } from '../../domain';
import { CopyFileResponse, CopyFilesOfParentPayload, FileRecordResponse } from '../dto';
import { FilesStorageMapper } from '../mapper';
import { FilesStorageEvents, FilesStorageExchange } from './files-storage.exchange';

@Injectable()
export class FilesStorageConsumer {
	constructor(
		private readonly filesStorageService: FilesStorageService,
		private readonly previewService: PreviewService,
		private readonly logger: Logger,
		private readonly orm: MikroORM // don't remove it, we need it for @CreateRequestContext
	) {
		this.logger.setContext(FilesStorageConsumer.name);
	}

	@RabbitRPC({
		exchange: FilesStorageExchange,
		routingKey: FilesStorageEvents.COPY_FILES_OF_PARENT,
		queue: FilesStorageEvents.COPY_FILES_OF_PARENT,
	})
	@CreateRequestContext()
	public async copyFilesOfParent(
		@RabbitPayload() payload: CopyFilesOfParentPayload
	): Promise<RpcMessage<CopyFileResponse[]>> {
		this.logger.debug(new FileStorageActionsLoggable('Start copy files of parent', { action: 'copyFilesOfParent' }));
		const { userId, source, target } = payload;
		const [response] = await this.filesStorageService.copyFilesOfParent(userId, source, target);

		return { message: response };
	}

	@RabbitRPC({
		exchange: FilesStorageExchange,
		routingKey: FilesStorageEvents.LIST_FILES_OF_PARENT,
		queue: FilesStorageEvents.LIST_FILES_OF_PARENT,
	})
	@CreateRequestContext()
	public async getFilesOfParent(@RabbitPayload() payload: EntityId): Promise<RpcMessage<FileRecordResponse[]>> {
		const [fileRecords, total] = await this.filesStorageService.getFileRecordsOfParent(payload);
		this.logger.debug(new FileStorageActionsLoggable('Start get files of parent', { action: 'getFilesOfParent' }));

		const response = FilesStorageMapper.mapToFileRecordListResponse(fileRecords, total);

		return { message: response.data };
	}

	@RabbitRPC({
		exchange: FilesStorageExchange,
		routingKey: FilesStorageEvents.DELETE_FILES_OF_PARENT,
		queue: FilesStorageEvents.DELETE_FILES_OF_PARENT,
	})
	@CreateRequestContext()
	public async deleteFilesOfParent(@RabbitPayload() payload: EntityId): Promise<RpcMessage<FileRecordResponse[]>> {
		const [fileRecords, total] = await this.filesStorageService.getFileRecordsOfParent(payload);
		this.logger.debug(
			new FileStorageActionsLoggable('Start delete files of parent', {
				action: 'deleteFilesOfParent',
				sourcePayload: fileRecords,
			})
		);

		await this.previewService.deletePreviews(fileRecords);
		await this.filesStorageService.deleteFilesOfParent(fileRecords);

		const response = FilesStorageMapper.mapToFileRecordListResponse(fileRecords, total);

		return { message: response.data };
	}

	@RabbitRPC({
		exchange: FilesStorageExchange,
		routingKey: FilesStorageEvents.DELETE_FILES,
		queue: FilesStorageEvents.DELETE_FILES,
	})
	@CreateRequestContext()
	public async deleteFiles(@RabbitPayload() payload: EntityId[]): Promise<RpcMessage<FileRecordResponse[]>> {
		const promise = payload.map((fileRecordId) => this.filesStorageService.getFileRecord(fileRecordId));
		const fileRecords = await Promise.all(promise);
		this.logger.debug(
			new FileStorageActionsLoggable('Start delete of files', { action: 'deleteFiles', sourcePayload: fileRecords })
		);

		await this.previewService.deletePreviews(fileRecords);
		await this.filesStorageService.delete(fileRecords);

		const response = FilesStorageMapper.mapToFileRecordListResponse(fileRecords, fileRecords.length);

		return { message: response.data };
	}

	@RabbitRPC({
		exchange: FilesStorageExchange,
		routingKey: FilesStorageEvents.REMOVE_CREATORID_OF_FILES,
		queue: FilesStorageEvents.REMOVE_CREATORID_OF_FILES,
	})
	@CreateRequestContext()
	public async removeCreatorIdFromFileRecords(
		@RabbitPayload() payload: EntityId
	): Promise<RpcMessage<FileRecordResponse[]>> {
		const [fileRecords] = await this.filesStorageService.getFileRecordsByCreatorId(payload);
		this.logger.debug(
			new FileStorageActionsLoggable('Start remove creator for files', {
				action: 'removeCreatorIdFromFileRecords',
				sourcePayload: fileRecords,
			})
		);

		await this.filesStorageService.removeCreatorIdFromFileRecords(fileRecords);

		const response = FilesStorageMapper.mapToFileRecordListResponse(fileRecords, fileRecords.length);

		return { message: response.data };
	}
}
