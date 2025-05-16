import { MongoMemoryServer } from 'mongodb-memory-server-global';

export default async function globalSetup() {
	const instance = await MongoMemoryServer.create({
		binary: {
			version: '6.0.16',
		},
	});
	const uri = instance.getUri();
	// @ts-ignore
	global.__MONGOINSTANCE = instance;
	// eslint-disable-next-line no-process-env
	process.env.MONGO_TEST_URI = uri.slice(0, uri.lastIndexOf('/'));
}
