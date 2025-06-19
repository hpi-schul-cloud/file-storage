/* eslint-disable @typescript-eslint/no-explicit-any */
import { validateSync } from 'class-validator';

type Constructor<T = {}> = new (...args: any[]) => T;

export interface ValueObject {
	equals(other: this): boolean;
	toJSON(): object;
	toString(): string;
}

function ValueObjectHelpers<TBase extends Constructor>(Base: TBase): TBase {
	return class extends Base {
		public equals(other: this): boolean {
			return JSON.stringify(this) === JSON.stringify(other);
		}

		public toString(): string {
			return JSON.stringify(this);
		}

		public toJSON(): object {
			const copyProps = { ...this };

			return copyProps;
		}
	} as TBase;
}

export function ValueObject<T extends Constructor>(constructor: T): T {
	const Mixed = ValueObjectHelpers(constructor);

	return class extends Mixed {
		constructor(...args: any[]) {
			super(...args);
			const errors = validateSync(this, { skipMissingProperties: false });
			if (errors.length > 0) {
				throw new Error(errors.toString());
			}
		}
	};
}
