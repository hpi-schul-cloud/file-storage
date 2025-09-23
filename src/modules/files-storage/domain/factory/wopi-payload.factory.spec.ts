import { ObjectId } from '@mikro-orm/mongodb';
import { WopiPayload } from '../vo';
import { WopiPayloadFactory } from './wopi-payload.factory';

describe('WopiPayloadFactory', () => {
	describe('build', () => {
		it('should create a WopiPayload instance with given properties', () => {
			const props = {
				fileRecordId: new ObjectId().toHexString(),
				canWrite: true,
				userDisplayName: 'Test User',
				userId: new ObjectId().toHexString(),
			};

			const payload = WopiPayloadFactory.build(props);

			expect(payload).toBeInstanceOf(WopiPayload);
			expect(payload.fileRecordId).toBe(props.fileRecordId);
			expect(payload.canWrite).toBe(props.canWrite);
			expect(payload.userDisplayName).toBe(props.userDisplayName);
			expect(payload.userId).toBe(props.userId);
		});
	});

	describe('buildFromParams', () => {
		it('should create a WopiPayload instance from parameters', () => {
			const fileRecordId = new ObjectId().toHexString();
			const canWrite = true;
			const userDisplayName = 'Test User';
			const userId = new ObjectId().toHexString();

			const payload = WopiPayloadFactory.buildFromParams(fileRecordId, canWrite, userDisplayName, userId);

			expect(payload).toBeInstanceOf(WopiPayload);
			expect(payload.fileRecordId).toBe(fileRecordId);
			expect(payload.canWrite).toBe(canWrite);
			expect(payload.userDisplayName).toBe(userDisplayName);
			expect(payload.userId).toBe(userId);
		});
	});

	describe('buildFromUnknownObject', () => {
		it('should create a WopiPayload instance from an unknown object', () => {
			const unknownObject = {
				fileRecordId: new ObjectId().toHexString(),
				canWrite: true,
				userDisplayName: 'Test User',
				userId: new ObjectId().toHexString(),
			};

			const payload = WopiPayloadFactory.buildFromUnknownObject(unknownObject);

			expect(payload).toBeInstanceOf(WopiPayload);
			expect(payload.fileRecordId).toBe(unknownObject.fileRecordId);
			expect(payload.canWrite).toBe(unknownObject.canWrite);
			expect(payload.userDisplayName).toBe(unknownObject.userDisplayName);
			expect(payload.userId).toBe(unknownObject.userId);
		});
	});
});
