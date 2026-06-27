import type { ClientInterface } from '@jellybrick/dbus-next';

/**
 * Invoke a dynamically-installed proxy interface method. Proxy methods are
 * attached at runtime from introspection, so they aren't on the
 * `ClientInterface` type — this resolves and calls them, keeping the single
 * unavoidable cast in one place.
 */
export const call = <T = unknown>(
  iface: ClientInterface,
  method: string,
  ...args: unknown[]
): Promise<T> => {
  const fn = (iface as unknown as Record<string, (...a: unknown[]) => Promise<T>>)[method];
  if (fn === undefined) {
    throw new Error(`proxy interface has no method '${method}'`);
  }
  return fn(...args);
};
