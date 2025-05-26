import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtValidationAdapter {
	/**
	 * When validating a jwt it must be added to a whitelist, here we check this.
	 * When the jwt is validated, the expiration time will be extended with this call.
	 * @param _accountId users account id
	 * @param jti jwt id (here required to make jwt identifiers identical in redis)
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public isWhitelisted(accountId: string, jti: string): Promise<void> {
		// @TODO resolve this problem
		//await ensureTokenIsWhitelisted({ accountId, jti, privateDevice: false });
		return Promise.resolve();
	}
}
