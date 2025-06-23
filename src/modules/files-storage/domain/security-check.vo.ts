import { ValueObject } from '@shared/domain/value-object.decorator';
import { IsDate, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { randomUUID } from 'node:crypto';

export enum ScanStatus {
	PENDING = 'pending',
	VERIFIED = 'verified',
	BLOCKED = 'blocked',
	WONT_CHECK = 'wont_check',
	ERROR = 'error',
}

export interface FileRecordSecurityCheckProps {
	status: ScanStatus;
	reason: string;
	updatedAt: Date;
	requestToken?: string;
}

@ValueObject()
export class FileRecordSecurityCheck implements FileRecordSecurityCheckProps {
	@IsEnum(ScanStatus)
	public readonly status: ScanStatus;

	@IsString()
	public readonly reason: string;

	@IsUUID()
	@IsOptional()
	public readonly requestToken?: string;

	/** lastSyncedAt */
	@IsDate()
	public readonly updatedAt: Date;

	constructor(props: FileRecordSecurityCheckProps) {
		this.status = props.status;
		this.reason = props.reason;
		this.updatedAt = props.updatedAt;
		this.requestToken = props.requestToken;
	}

	public static createWithDefaultProps(): FileRecordSecurityCheck {
		const props = {
			status: ScanStatus.PENDING,
			reason: 'not yet scanned',
			updatedAt: new Date(),
			requestToken: randomUUID(),
		};
		const securityCheck = new FileRecordSecurityCheck(props);

		return securityCheck;
	}

	public scanned(status: ScanStatus, reason: string): FileRecordSecurityCheck {
		const scanned = new FileRecordSecurityCheck({
			status,
			reason,
			updatedAt: new Date(),
			requestToken: undefined,
		});

		return scanned;
	}

	public isBlocked(): boolean {
		const isBlocked = this.status === ScanStatus.BLOCKED;

		return isBlocked;
	}

	public hasScanStatusWontCheck(): boolean {
		const hasWontCheckStatus = this.status === ScanStatus.WONT_CHECK;

		return hasWontCheckStatus;
	}

	public isPending(): boolean {
		const isPending = this.status === ScanStatus.PENDING;

		return isPending;
	}

	public isVerified(): boolean {
		const isVerified = this.status === ScanStatus.VERIFIED;

		return isVerified;
	}

	public copy(): FileRecordSecurityCheck {
		const copy = new FileRecordSecurityCheck({
			status: this.status,
			reason: this.reason,
			updatedAt: this.updatedAt,
			requestToken: this.requestToken,
		});

		return copy;
	}

	public getProps(): FileRecordSecurityCheckProps {
		const copyProps = { ...this };

		return copyProps;
	}
}
