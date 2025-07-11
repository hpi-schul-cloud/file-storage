import { FilterQuery } from '@mikro-orm/mongodb';
import { EmptyResultQuery } from './query';

type EmptyResultQueryType = typeof EmptyResultQuery;

type ScopeOperator = '$and' | '$or';

export class Scope<T> {
	private readonly _queries: (FilterQuery<T> | EmptyResultQueryType)[] = [];

	private readonly _operator: ScopeOperator;

	private _allowEmptyQuery: boolean;

	constructor(operator: ScopeOperator = '$and') {
		this._operator = operator;
		this._allowEmptyQuery = false;
	}

	get query(): FilterQuery<T> {
		if (this._queries.length === 0) {
			if (this._allowEmptyQuery) {
				return {} as FilterQuery<T>;
			}

			return EmptyResultQuery as FilterQuery<T>;
		}
		const query = this._queries.length > 1 ? { [this._operator]: this._queries } : this._queries[0];

		return query as FilterQuery<T>;
	}

	public addQuery(query: FilterQuery<T> | EmptyResultQueryType): void {
		this._queries.push(query);
	}

	public allowEmptyQuery(isEmptyQueryAllowed: boolean): this {
		this._allowEmptyQuery = isEmptyQueryAllowed;

		return this;
	}
}
