/**
 * Utility classes with NO `@category`, so they fall into the **Classes** kind
 * section. `@order` positions them there directly: `Logger` (1), then `Metrics`
 * (2), then `Cache` (no `@order` → sorts last, alphabetically). That's the
 * "order children within a section" case, without any category grouping.
 */

/**
 * A minimal structured logger.
 *
 * @order 1
 */
export class Logger {
  /** Emit an info-level line. */
  info(message: string): void {
    void message;
  }
}

/**
 * Counters and timers for instrumentation.
 *
 * @order 2
 */
export class Metrics {
  private counters = new Map<string, number>();

  /** Increment a named counter. */
  increment(name: string): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + 1);
  }
}

/**
 * A tiny in-memory cache. No `@order`, so it sorts after the ordered classes
 * (and alphabetically among any other unordered ones).
 */
export class Cache<V> {
  private store = new Map<string, V>();

  /** Read a cached value. */
  get(key: string): V | undefined {
    return this.store.get(key);
  }

  /** Write a cached value. */
  set(key: string, value: V): void {
    this.store.set(key, value);
  }
}
