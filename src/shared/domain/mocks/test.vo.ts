import { IsInt, IsString } from 'class-validator';
import { ValueObject } from '../value-object.decorator';

interface TestVOProps {
	a: number;
	b: string;
}

@ValueObject()
export class TestVO {
	@IsInt()
	public readonly integer: number;

	@IsString()
	public readonly string: string;

	constructor(props: TestVOProps) {
		this.integer = props.a;
		this.string = props.b;
	}
}
