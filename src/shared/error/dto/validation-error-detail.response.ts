export class ValidationErrorDetailResponse {
	constructor(
		public readonly field: string[],
		public readonly errors: string[]
	) {}
}
