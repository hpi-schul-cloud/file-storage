import { ObjectId } from '@mikro-orm/mongodb';
import { fileRecordTestFactory } from '@modules/files-storage/testing';
import { WopiCheckFileInfoResponse } from '../dto';
import { WopiCheckFileInfoResponseFactory } from './wopi-check-file-info.response.factory';

describe('WopiCheckFileInfoResponseFactory', () => {
	describe('build', () => {
		describe('when all props are provided', () => {
			const setup = () => {
				const props: WopiCheckFileInfoResponse = {
					Size: 123,
					UserId: new ObjectId().toHexString(),
					UserFriendlyName: 'Test User',
					BaseFileName: 'file.txt',
					UserCanWrite: true,
					OwnerId: new ObjectId().toHexString(),
					LastModifiedTime: '2024-01-01T00:00:00.000Z',
				};

				const result = WopiCheckFileInfoResponseFactory.build(props);

				return {
					props,
					result,
				};
			};

			it('should return a WopiCheckFileInfoResponse instance with correct properties', () => {
				const { props, result } = setup();

				expect(result.Size).toBe(props.Size);
				expect(result.UserId).toBe(props.UserId);
				expect(result.UserFriendlyName).toBe(props.UserFriendlyName);
				expect(result.BaseFileName).toBe(props.BaseFileName);
				expect(result.UserCanWrite).toBe(props.UserCanWrite);
				expect(result.OwnerId).toBe(props.OwnerId);
				expect(result.LastModifiedTime).toBe(props.LastModifiedTime);
			});
		});

		describe('when ownerId is missing', () => {
			const setup = () => {
				const props: WopiCheckFileInfoResponse = {
					Size: 123,
					UserId: new ObjectId().toHexString(),
					UserFriendlyName: 'Test User',
					BaseFileName: 'file.txt',
					UserCanWrite: true,
					OwnerId: undefined,
					LastModifiedTime: '2024-01-01T00:00:00.000Z',
				};

				const result = WopiCheckFileInfoResponseFactory.build(props);

				return {
					props,
					result,
				};
			};

			it('should return a WopiCheckFileInfoResponse instance with correct properties', () => {
				const { props, result } = setup();

				expect(result.Size).toBe(props.Size);
				expect(result.UserId).toBe(props.UserId);
				expect(result.UserFriendlyName).toBe(props.UserFriendlyName);
				expect(result.BaseFileName).toBe(props.BaseFileName);
				expect(result.UserCanWrite).toBe(props.UserCanWrite);
				expect(result.OwnerId).toBeUndefined();
				expect(result.LastModifiedTime).toBe(props.LastModifiedTime);
			});
		});
	});

	describe('buildFromFileRecordAndUser', () => {
		describe('when fileRecord contains all props', () => {
			const setup = () => {
				const fileRecord = fileRecordTestFactory().build();
				const user = {
					id: new ObjectId().toHexString(),
					userName: 'Test User',
					canWrite: true,
				};

				const result = WopiCheckFileInfoResponseFactory.buildFromFileRecordAndUser(fileRecord, user);

				return {
					fileRecord,
					user,
					result,
				};
			};

			it('should return a WopiCheckFileInfoResponse with correct values from fileRecord and user', () => {
				const { fileRecord, user, result } = setup();

				expect(result.Size).toBe(fileRecord.getProps().size);
				expect(result.UserId).toBe(user.id);
				expect(result.UserFriendlyName).toBe(user.userName);
				expect(result.BaseFileName).toBe(fileRecord.getName());
				expect(result.UserCanWrite).toBe(user.canWrite);
				expect(result.OwnerId).toBe(fileRecord.getProps().creatorId);
				expect(result.LastModifiedTime).toBe(fileRecord.getProps().updatedAt.toISOString());
			});
		});

		describe('when fileRecord is missing creatorId', () => {
			const setup = () => {
				const fileRecord = fileRecordTestFactory().build({ creatorId: undefined });
				const user = {
					id: new ObjectId().toHexString(),
					userName: 'Test User',
					canWrite: true,
				};

				const result = WopiCheckFileInfoResponseFactory.buildFromFileRecordAndUser(fileRecord, user);

				return {
					fileRecord,
					user,
					result,
				};
			};

			it('should return a WopiCheckFileInfoResponse with undefined OwnerId', () => {
				const { fileRecord, user, result } = setup();

				expect(result.Size).toBe(fileRecord.getProps().size);
				expect(result.UserId).toBe(user.id);
				expect(result.UserFriendlyName).toBe(user.userName);
				expect(result.BaseFileName).toBe(fileRecord.getName());
				expect(result.UserCanWrite).toBe(user.canWrite);
				expect(result.OwnerId).toBeUndefined();
				expect(result.LastModifiedTime).toBe(fileRecord.getProps().updatedAt.toISOString());
			});
		});
	});
});
