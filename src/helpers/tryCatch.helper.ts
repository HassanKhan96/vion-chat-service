export type SuccessType<T> = readonly [T, null];
export type ErrorType<E = Error> = readonly [null, E];

export type ResultType<T, E = Error> = SuccessType<T> | ErrorType<E>;

export async function tryCatch<T, E = Error>(
  promise: Promise<T>
): Promise<ResultType<T, E>> {
  try {
    const data = await promise;
    return [data, null] as const;
  } catch (error) {
    return [null, error as E] as const;
  }
}
