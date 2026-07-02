/** A successful operation result. */
export class Ok<T> {
	readonly _tag = 'ok' as const;

	constructor(readonly value: T) {}

	/** Narrow this result to a success. */
	isOk(): this is Ok<T> {
		return true;
	}

	/** Narrow this result to a failure. */
	isErr(): this is Err<never> {
		return false;
	}
}

/** A failed operation result. */
export class Err<E extends Error> {
	readonly _tag = 'err' as const;

	constructor(readonly error: E) {}

	/** Narrow this result to a success. */
	isOk(): this is Ok<never> {
		return false;
	}

	/** Narrow this result to a failure. */
	isErr(): this is Err<E> {
		return true;
	}
}

/** A successful or failed operation result. */
export type Result<T, E extends Error> = Ok<T> | Err<E>;

/** Factory for building {@link Result} values. */
export class Results {
	/** Build a successful result. */
	static ok<T>(value: T): Ok<T> {
		return new Ok(value);
	}

	/** Build a failed result. */
	static err<E extends Error>(error: E): Err<E> {
		return new Err(error);
	}
}
