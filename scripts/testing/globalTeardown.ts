import { MongoMemoryServer } from 'mongodb-memory-server-global';

export default async function globalTeardown() {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	// @ts-ignore
	const instance: MongoMemoryServer = global.__MONGOINSTANCE;
	await instance.stop();
}
