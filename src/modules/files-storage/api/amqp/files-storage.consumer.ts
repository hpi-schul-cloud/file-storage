import { RabbitPayload, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { Logger } from '@infra/logger';
import { RpcMessage } from '@infra/rabbitmq';
import { CreateRequestContext, MikroORM } from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';
import { EntityId } from '@shared/domain/types';
import { FileRecord, FilesStorageService, FileStorageActionsLoggable, PreviewService } from '../../domain';
import { CopyFileResponse, CopyFilesOfParentPayload } from '../dto';
import { FileRecordConsumerResponse } from './dto';
import { FilesStorageEvents, FilesStorageExchange } from './files-storage.exchange';
import { FileRecordConsumerMapper } from './mapper';

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
		const [fileRecords] = await this.filesStorageService.getFileRecordsOfParent(payload.source.parentId);
		this.logStartCopyFilesOfParent(fileRecords);

		const copyFileResults = await this.filesStorageService.copyFilesToParent(
			payload.userId,
			fileRecords,
			payload.target
		);

		return { message: copyFileResults };
	}

	@RabbitRPC({
		exchange: FilesStorageExchange,
		routingKey: FilesStorageEvents.LIST_FILES_OF_PARENT,
		queue: FilesStorageEvents.LIST_FILES_OF_PARENT,
	})
	@CreateRequestContext()
	public async getFilesOfParent(@RabbitPayload() payload: EntityId): Promise<RpcMessage<FileRecordConsumerResponse[]>> {
		const [fileRecords, total] = await this.filesStorageService.getFileRecordsOfParent(payload);
		this.logStartGetFilesOfParent(fileRecords);

		const fileRecordListResponse = FileRecordConsumerMapper.mapToFileRecordListResponse(fileRecords, total);

		return { message: fileRecordListResponse.data };
	}

	@RabbitRPC({
		exchange: FilesStorageExchange,
		routingKey: FilesStorageEvents.DELETE_FILES_OF_PARENT,
		queue: FilesStorageEvents.DELETE_FILES_OF_PARENT,
	})
	@CreateRequestContext()
	public async deleteFilesOfParent(
		@RabbitPayload() payload: EntityId
	): Promise<RpcMessage<FileRecordConsumerResponse[]>> {
		const [fileRecords, total] = await this.filesStorageService.getFileRecordsOfParent(payload);
		this.logStartDeleteFilesOfParent(fileRecords);

		await this.previewService.deletePreviews(fileRecords);
		await this.filesStorageService.deleteFiles(fileRecords);

		const fileRecordResponse = FileRecordConsumerMapper.mapToFileRecordListResponse(fileRecords, total);

		return { message: fileRecordResponse.data };
	}

	@RabbitRPC({
		exchange: FilesStorageExchange,
		routingKey: FilesStorageEvents.DELETE_FILES,
		queue: FilesStorageEvents.DELETE_FILES,
	})
	@CreateRequestContext()
	public async deleteFiles(@RabbitPayload() payload: EntityId[]): Promise<RpcMessage<FileRecordConsumerResponse[]>> {
		const [fileRecords, count] = await this.filesStorageService.getFileRecords(payload);
		this.logStartDeleteFiles(fileRecords);

		await this.previewService.deletePreviews(fileRecords);
		await this.filesStorageService.deleteFiles(fileRecords);

		const fileRecordListResponse = FileRecordConsumerMapper.mapToFileRecordListResponse(fileRecords, count);

		return { message: fileRecordListResponse.data };
	}

	@RabbitRPC({
		exchange: FilesStorageExchange,
		routingKey: FilesStorageEvents.REMOVE_CREATORID_OF_FILES,
		queue: FilesStorageEvents.REMOVE_CREATORID_OF_FILES,
	})
	@CreateRequestContext()
	public async removeCreatorIdFromFileRecords(
		@RabbitPayload() payload: EntityId
	): Promise<RpcMessage<FileRecordConsumerResponse[]>> {
		const [fileRecords] = await this.filesStorageService.getFileRecordsByCreatorId(payload);
		this.logStartRemoveCreatorId(fileRecords);

		await this.filesStorageService.removeCreatorIdFromFileRecords(fileRecords);

		const fileRecordListResponse = FileRecordConsumerMapper.mapToFileRecordListResponse(
			fileRecords,
			fileRecords.length
		);

		return { message: fileRecordListResponse.data };
	}

	private logStartDeleteFiles(fileRecords: FileRecord[]): void {
		this.logger.debug(
			new FileStorageActionsLoggable('Start delete of files', { action: 'deleteFiles', sourcePayload: fileRecords })
		);
	}

	private logStartDeleteFilesOfParent(fileRecords: FileRecord[]): void {
		this.logger.debug(
			new FileStorageActionsLoggable('Start delete files of parent', {
				action: 'deleteFilesOfParent',
				sourcePayload: fileRecords,
			})
		);
	}

	private logStartRemoveCreatorId(fileRecords: FileRecord[]): void {
		this.logger.debug(
			new FileStorageActionsLoggable('Start remove creator for files', {
				action: 'removeCreatorIdFromFileRecords',
				sourcePayload: fileRecords,
			})
		);
	}

	private logStartGetFilesOfParent(fileRecords: FileRecord[]): void {
		this.logger.debug(
			new FileStorageActionsLoggable('Start get files of parent', {
				action: 'getFilesOfParent',
				sourcePayload: fileRecords,
			})
		);
	}

	private logStartCopyFilesOfParent(fileRecords: FileRecord[]): void {
		this.logger.debug(
			new FileStorageActionsLoggable('Start copy files of parent', {
				action: 'copyFilesOfParent',
				sourcePayload: fileRecords,
			})
		);
	}
}
