/* eslint-disable @typescript-eslint/no-explicit-any */
interface PropertyAccessKey {
	propertyKey: string;
	key?: string;
}

export interface WithConfigurationDecorator {
	[key: string]: unknown;
	getConfigKeys(): string[];
}

export function Configuration() {
	return function ConfigurationDecorator<T extends new (...args: any[]) => {}>(constructor: T): T {
		return class extends constructor {
			constructor(...args: any[]) {
				super(...args);
				const proxyInstance = new Proxy(this, {
					set: (target, prop, value): true => {
						const propertyAccessKeys: PropertyAccessKey[] = this.getPropertyAccessKeys();
						const propKey =
							propertyAccessKeys.find((item: PropertyAccessKey) => item.key === prop)?.propertyKey ?? prop;
						if (propKey) {
							(target as any)[propKey] = value;
						}

						return true;
					},
					get: (target, prop, receiver): any => {
						const value = Reflect.get(target, prop, receiver);

						return value;
					},
				});

				return proxyInstance;
			}

			public getConfigKeys(): string[] {
				const objectKeys = Object.keys(this);
				const propertyAccessKeys: PropertyAccessKey[] = this.getPropertyAccessKeys();
				const keys = propertyAccessKeys.map((item: PropertyAccessKey) => item.key ?? item.propertyKey);

				for (const key of objectKeys) {
					if (!propertyAccessKeys.some((item) => item.propertyKey === key)) {
						keys.push(key);
					}
				}

				return keys;
			}

			private getPropertyAccessKeys(): PropertyAccessKey[] {
				//@ts-expect-error - We are dynamically setting properties
				return this.__proto__.__propertyAccessKeys ?? [];
			}
		};
	};
}

export function ConfigProperty(key?: string): PropertyDecorator {
	return function (target: any, propertyKey: string | symbol) {
		target.__propertyAccessKeys ??= [];
		target.__propertyAccessKeys.push({ propertyKey, key });
	};
}
