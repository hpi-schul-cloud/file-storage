import { ReferenceAuthorizationInfo } from './reference-authorization-info.vo';

describe('ReferenceAuthorizationInfo', () => {
	describe('constructor', () => {
		const setup = () => {
			const props: ReferenceAuthorizationInfo = {
				referenceType: 'someType',
				referenceId: 'someId',
				isAuthorized: true,
			};

			return {
				props,
			};
		};

		it('should assign properties correctly', () => {
			const { props } = setup();

			const result = new ReferenceAuthorizationInfo(props);

			expect(result).toEqual(props);
		});
	});
});
