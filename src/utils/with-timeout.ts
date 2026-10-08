/**
 * Resolves with `onTimeout()` if `promise` has not settled within `ms`. Pure.
 *
 * Used for booking and cancellation (AD-44): if the server does not answer in time
 * the user is told the result is *unconfirmed* — never "failed" (it may still have
 * committed) and never "booked". The underlying request is not retried or queued.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve(onTimeout());
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
