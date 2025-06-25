import { randomUUID } from 'node:crypto';
import { FileRecordSecurityCheck, ScanStatus } from './security-check.vo';

describe('FileRecordSecurityCheck', () => {
	describe('constructor', () => {
		const setup = () => {
			const now = new Date();
			const props = {
				status: ScanStatus.VERIFIED,
				reason: 'scanned',
				updatedAt: now,
				requestToken: '123e4567-e89b-12d3-a456-426614174000',
			};

			return { props };
		};

		it('should assign properties correctly', () => {
			const { props } = setup();

			const check = new FileRecordSecurityCheck(props);

			expect(check.status).toBe(props.status);
			expect(check.reason).toBe(props.reason);
			expect(check.updatedAt).toBe(props.updatedAt);
			expect(check.requestToken).toBe(props.requestToken);
		});
	});

	describe('createWithDefaultProps', () => {
		it('should create with default props', () => {
			const check = FileRecordSecurityCheck.createWithDefaultProps();

			expect(check.status).toBe(ScanStatus.PENDING);
			expect(check.reason).toBe('not yet scanned');
			expect(check.updatedAt).toBeInstanceOf(Date);
			expect(typeof check.requestToken).toBe('string');
		});
	});

	describe('scanned', () => {
		const setup = () => {
			const securityCheckVO = FileRecordSecurityCheck.createWithDefaultProps();

			return { securityCheckVO };
		};

		it('should NOT update status, reason, updatedAt and clear requestToken', () => {
			const { securityCheckVO } = setup();

			FileRecordSecurityCheck.scanned(ScanStatus.BLOCKED, 'virus detected');

			expect(securityCheckVO.status).not.toBe(ScanStatus.BLOCKED);
			expect(securityCheckVO.reason).not.toBe('virus detected');
			expect(securityCheckVO.requestToken).not.toBeUndefined();
		});
	});

	describe('isBlocked', () => {
		describe('when status is BLOCKED', () => {
			const setup = () => {
				const props = {
					status: ScanStatus.BLOCKED,
					reason: '',
					updatedAt: new Date(),
				};
				const securityCheckVO = new FileRecordSecurityCheck(props);

				return { props, securityCheckVO };
			};

			it('should return true', () => {
				const { securityCheckVO } = setup();

				expect(securityCheckVO.isBlocked()).toBe(true);
			});
		});

		describe('when status is not BLOCKED', () => {
			const setup = () => {
				const props = {
					status: ScanStatus.PENDING,
					reason: '',
					updatedAt: new Date(),
				};

				return { props };
			};

			it('should return false', () => {
				const { props } = setup();
				const check = new FileRecordSecurityCheck(props);

				expect(check.isBlocked()).toBe(false);
			});
		});
	});

	describe('hasScanStatusWontCheck', () => {
		it('should return true if status is WONT_CHECK', () => {
			const check = new FileRecordSecurityCheck({
				status: ScanStatus.WONT_CHECK,
				reason: '',
				updatedAt: new Date(),
			});

			expect(check.hasScanStatusWontCheck()).toBe(true);
		});
		it('should return false if status is not WONT_CHECK', () => {
			const check = new FileRecordSecurityCheck({
				status: ScanStatus.ERROR,
				reason: '',
				updatedAt: new Date(),
			});
			expect(check.hasScanStatusWontCheck()).toBe(false);
		});
	});

	describe('isPending', () => {
		it('should return true if status is PENDING', () => {
			const check = new FileRecordSecurityCheck({
				status: ScanStatus.PENDING,
				reason: '',
				updatedAt: new Date(),
			});
			expect(check.isPending()).toBe(true);
		});
		it('should return false if status is not PENDING', () => {
			const check = new FileRecordSecurityCheck({
				status: ScanStatus.VERIFIED,
				reason: '',
				updatedAt: new Date(),
			});
			expect(check.isPending()).toBe(false);
		});
	});

	describe('isVerified', () => {
		it('should return true if status is VERIFIED', () => {
			const check = new FileRecordSecurityCheck({
				status: ScanStatus.VERIFIED,
				reason: '',
				updatedAt: new Date(),
			});
			expect(check.isVerified()).toBe(true);
		});
		it('should return false if status is not VERIFIED', () => {
			const check = new FileRecordSecurityCheck({
				status: ScanStatus.ERROR,
				reason: '',
				updatedAt: new Date(),
			});
			expect(check.isVerified()).toBe(false);
		});
	});

	describe('copy', () => {
		it('should create a new instance with the same properties', () => {
			const props = {
				status: ScanStatus.ERROR,
				reason: 'error',
				updatedAt: new Date(),
				requestToken: randomUUID(),
			};
			const check = new FileRecordSecurityCheck(props);
			const copy = check.copy();
			expect(copy).not.toBe(check);
			expect(copy.status).toBe(check.status);
			expect(copy.reason).toBe(check.reason);
			expect(copy.updatedAt).toBe(check.updatedAt);
			expect(copy.requestToken).toBe(check.requestToken);
		});
	});

	describe('getProps', () => {
		it('should return a copy of the properties', () => {
			const props = {
				status: ScanStatus.ERROR,
				reason: 'error',
				updatedAt: new Date(),
				requestToken: randomUUID(),
			};
			const check = new FileRecordSecurityCheck(props);
			const result = check.getProps();
			expect(result.status).toBe(props.status);
			expect(result.reason).toBe(props.reason);
			expect(result.updatedAt).toBe(props.updatedAt);
			expect(result.requestToken).toBe(props.requestToken);
		});
	});
});
