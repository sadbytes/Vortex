/**
 * Native-promise replacements for the Bluebird collection statics
 * (`Promise.mapSeries`, `Promise.each`, `Promise.reduce`, `Promise.filter`).
 *
 * The parallel `Promise.map(items, fn)` has a direct native equivalent
 * (`Promise.all(items.map(fn))`) and intentionally has no helper here.
 *
 * Mapper/iterator callbacks receive `(item, index, length)` to match the
 * Bluebird signatures the call sites were written against.
 */

export type AsyncMapper<T, U> = (item: T, index: number, length: number) => U | PromiseLike<U>;

type ErrorConstructor<E> = new (...args: any[]) => E;

function matchesErrorPredicate(predicate: unknown, err: unknown): boolean {
  if (typeof predicate === "function") {
    // every function predicate in this codebase is an Error subclass used as
    // a type filter (the Bluebird `.catch(ErrorClass, handler)` form).
    return err instanceof (predicate as ErrorConstructor<unknown>);
  }
  if (predicate !== null && typeof predicate === "object") {
    // shape match, e.g. `only({ code: "ENOENT" }, ...)`
    return Object.keys(predicate).every(
      (key) =>
        (err as Record<string, unknown>)?.[key] === (predicate as Record<string, unknown>)[key],
    );
  }
  return false;
}

/**
 * build a rejection handler that only handles errors matching `predicate`
 * and re-throws everything else. Replaces Bluebird's filtered-catch form
 * `promise.catch(ErrorClass, handler)` / `promise.catch({ code }, handler)`
 * with the native `promise.catch(only(ErrorClass, handler))`.
 */
export function only<E extends Error, T>(
  ErrorClass: ErrorConstructor<E>,
  handler: (err: E) => T | PromiseLike<T>,
): (err: unknown) => T | PromiseLike<T>;
export function only<T>(
  predicate: Record<string, unknown>,
  handler: (err: any) => T | PromiseLike<T>,
): (err: unknown) => T | PromiseLike<T>;
export function only<T>(
  predicate: unknown,
  handler: (err: any) => T | PromiseLike<T>,
): (err: unknown) => T | PromiseLike<T> {
  return (err: unknown) => {
    if (matchesErrorPredicate(predicate, err)) {
      return handler(err);
    }
    throw err;
  };
}

/**
 * the settled state of a promise, mirroring the subset of Bluebird's
 * `PromiseInspection` interface that the codebase actually uses.
 */
export interface Inspection<T> {
  isFulfilled(): boolean;
  isRejected(): boolean;
  value(): T;
  reason(): unknown;
}

/**
 * settle a promise into an inspection object instead of fulfilling/rejecting.
 * Equivalent to Bluebird's `promise.reflect()`.
 */
export function reflect<T>(promise: PromiseLike<T>): Promise<Inspection<T>> {
  return Promise.resolve(promise).then(
    (value): Inspection<T> => ({
      isFulfilled: () => true,
      isRejected: () => false,
      value: () => value,
      reason: () => {
        throw new TypeError("reason() called on a fulfilled promise inspection");
      },
    }),
    (reason): Inspection<T> => ({
      isFulfilled: () => false,
      isRejected: () => true,
      value: () => {
        throw new TypeError("value() called on a rejected promise inspection");
      },
      reason: () => reason,
    }),
  );
}

/**
 * wait for the specified number of milliseconds before resolving.
 * Native equivalent of `Bluebird.delay`.
 */
export function delay(timeoutMS: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, timeoutMS);
  });
}

export interface IMapOptions {
  /** maximum number of mappers running at once (default: unlimited) */
  concurrency?: number;
}

/**
 * map over a list, resolving to the list of results in input order.
 * Equivalent to `Bluebird.map`. Without `concurrency` it runs fully in
 * parallel (`Promise.all`); with `concurrency` it runs at most N mappers
 * at a time. Also threads `(item, index, length)` to the mapper.
 */
export async function map<T, U>(
  items: readonly T[],
  mapper: AsyncMapper<T, U>,
  options?: IMapOptions,
): Promise<U[]> {
  const concurrency = options?.concurrency ?? Infinity;
  if (!Number.isFinite(concurrency) || concurrency >= items.length) {
    return Promise.all(items.map((item, index) => mapper(item, index, items.length)));
  }

  const results: U[] = new Array(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++;
      results[index] = await mapper(items[index], index, items.length);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
  return results;
}

/**
 * map over a list sequentially (one element at a time, in order),
 * resolving to the list of results. Equivalent to `Bluebird.mapSeries`.
 */
export async function mapSeries<T, U>(
  items: readonly T[],
  mapper: AsyncMapper<T, U>,
): Promise<U[]> {
  const result: U[] = [];
  for (let i = 0; i < items.length; ++i) {
    result.push(await mapper(items[i], i, items.length));
  }
  return result;
}

/**
 * iterate over a list sequentially for side effects, resolving to the
 * original list (results of the iterator are discarded).
 * Equivalent to `Bluebird.each`.
 */
export async function each<T>(
  items: readonly T[],
  iterator: (item: T, index: number, length: number) => unknown | PromiseLike<unknown>,
): Promise<readonly T[]> {
  for (let i = 0; i < items.length; ++i) {
    await iterator(items[i], i, items.length);
  }
  return items;
}

/**
 * reduce a list sequentially. Equivalent to `Bluebird.reduce`.
 * If `initialValue` is omitted the first element is used as the seed.
 */
export async function reduce<T, U>(
  items: readonly T[],
  reducer: (acc: U, item: T, index: number, length: number) => U | PromiseLike<U>,
  initialValue?: U,
): Promise<U> {
  let acc: U;
  let startIdx: number;
  if (arguments.length >= 3) {
    acc = initialValue as U;
    startIdx = 0;
  } else {
    // mirror Bluebird/Array.reduce: seed with the first element
    acc = items[0] as unknown as U;
    startIdx = 1;
  }
  for (let i = startIdx; i < items.length; ++i) {
    acc = await reducer(acc, items[i], i, items.length);
  }
  return acc;
}

/**
 * filter a list by an async predicate, preserving order.
 * Predicates are evaluated in parallel (matching Bluebird's default,
 * concurrency-less behaviour). Equivalent to `Bluebird.filter`.
 */
export async function filter<T>(
  items: readonly T[],
  predicate: (item: T, index: number, length: number) => boolean | PromiseLike<boolean>,
): Promise<T[]> {
  const keep = await Promise.all(
    items.map((item, index) => Promise.resolve(predicate(item, index, items.length))),
  );
  return items.filter((_item, index) => keep[index]);
}
