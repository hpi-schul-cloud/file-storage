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
		@RabbitPayload() { userId, source, target }: CopyFilesOfParentPayload
	): Promise<RpcMessage<CopyFileResponse[]>> {
		this.copyFilesOfParentLog();
		const [fileRecords] = await this.filesStorageService.getFileRecordsByStorageLocationIdAndParentId(source);
		const copyFileResults = await this.filesStorageService.copyFilesToParent(userId, fileRecords, target);

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
		this.getFilesOfParentLog(fileRecords);

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
		this.deleteFilesOfParentLog(fileRecords);

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
		const promise = payload.map((fileRecordId) => this.filesStorageService.getFileRecord(fileRecordId));
		const fileRecords = await Promise.all(promise);
		this.deleteFilesLog(fileRecords);

		await this.previewService.deletePreviews(fileRecords);
		await this.filesStorageService.deleteFiles(fileRecords);

		const fileRecordListResponse = FileRecordConsumerMapper.mapToFileRecordListResponse(
			fileRecords,
			fileRecords.length
		);

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
		this.removeCreatorIdLog(fileRecords);

		await this.filesStorageService.removeCreatorIdFromFileRecords(fileRecords);

		const fileRecordListResponse = FileRecordConsumerMapper.mapToFileRecordListResponse(
			fileRecords,
			fileRecords.length
		);

		return { message: fileRecordListResponse.data };
	}

	private deleteFilesLog(fileRecords: FileRecord[]): void {
		this.logger.debug(
			new FileStorageActionsLoggable('Start delete of files', { action: 'deleteFiles', sourcePayload: fileRecords })
		);
	}

	private deleteFilesOfParentLog(fileRecords: FileRecord[]): void {
		this.logger.debug(
			new FileStorageActionsLoggable('Start delete files of parent', {
				action: 'deleteFilesOfParent',
				sourcePayload: fileRecords,
			})
		);
	}

	private removeCreatorIdLog(fileRecords: FileRecord[]): void {
		this.logger.debug(
			new FileStorageActionsLoggable('Start remove creator for files', {
				action: 'removeCreatorIdFromFileRecords',
				sourcePayload: fileRecords,
			})
		);
	}

	private getFilesOfParentLog(fileRecords: FileRecord[]): void {
		this.logger.debug(
			new FileStorageActionsLoggable('Start get files of parent', {
				action: 'getFilesOfParent',
				sourcePayload: fileRecords,
			})
		);
	}

	private copyFilesOfParentLog(): void {
		this.logger.debug(new FileStorageActionsLoggable('Start copy files of parent', { action: 'copyFilesOfParent' }));
	}
}
