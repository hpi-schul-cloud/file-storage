import { ScanStatus } from '../security-check.vo';

export class ScanResultDto {
	status: ScanStatus;

	reason: string;

	constructor(props: ScanResultDto) {
		this.status = props.status;
		this.reason = props.reason;
	}
}
