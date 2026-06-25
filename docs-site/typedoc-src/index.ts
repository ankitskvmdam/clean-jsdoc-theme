/**
 * A tiny in-memory **toolkit** documented with TypeScript, rendered by the
 * clean-jsdoc-theme TypeDoc plugin.
 *
 * This page exists to show the TypeDoc pipeline end to end — classes,
 * interfaces, type aliases, enums, generics, overloads, and object-literal
 * constants all get the same SSR + search + copy-page treatment as the JSDoc
 * build.
 *
 * @packageDocumentation
 */

/**
 * Severity levels for {@link Logger}, as an object-literal constant.
 *
 * @remarks
 * Each entry keeps its own doc comment, so the page lists every member under
 * "Properties" alongside the pretty-printed shape.
 *
 * @public
 */
export const LOG_LEVELS = {
  /** Fine-grained tracing, off in production. */
  DEBUG: 10,
  /** Normal operational messages. */
  INFO: 20,
  /** Something unexpected, but recoverable. */
  WARN: 30,
  /** A failure that needs attention. */
  ERROR: 40,
} as const

/** A log level — one of the values of {@link LOG_LEVELS}. */
export type Level = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS]

/**
 * Turns a message + level into the final string written to the sink.
 *
 * @param message - The raw message.
 * @param level - The severity it was logged at.
 * @returns The formatted line.
 *
 * @public
 */
export type Formatter = (message: string, level: Level) => string

/**
 * A minimal logging surface.
 *
 * @example
 * ```typescript
 * const logger: Logger = new ConsoleLogger()
 * logger.log('starting up', LOG_LEVELS.INFO)
 * ```
 *
 * @public
 */
export interface Logger {
  /** The minimum level this logger emits. */
  minLevel: Level
  /** An optional custom formatter; the default prefixes the level name. */
  format?: Formatter
  /** Write a message at the given level. */
  log(message: string, level: Level): void
  /** Convenience wrapper for {@link LOG_LEVELS.INFO}. */
  info(message: string): void
}

/**
 * The lifecycle status of a {@link Store}.
 *
 * @public
 */
export enum Status {
  /** Created but not yet opened. */
  Idle = 'idle',
  /** Open and accepting reads/writes. */
  Open = 'open',
  /** Closed; further access throws. */
  Closed = 'closed',
}

/**
 * A typed key/value store with a fixed capacity.
 *
 * @typeParam T - The value type held by the store.
 *
 * @public
 */
export class Store<T> {
  /** Current lifecycle status. */
  status: Status = Status.Idle

  private readonly items = new Map<string, T>()

  /**
   * Create a store.
   *
   * @param capacity - Maximum number of entries before {@link Store.set} throws.
   * @param logger - Optional logger for diagnostics.
   */
  constructor(
    public readonly capacity: number,
    private readonly logger?: Logger
  ) {
    this.status = Status.Open
  }

  /** The number of entries currently held. */
  get size(): number {
    return this.items.size
  }

  /**
   * Store a value under `key`.
   *
   * @param key - The lookup key.
   * @param value - The value to store.
   * @throws If the store is full or not open.
   */
  set(key: string, value: T): void {
    if (this.status !== Status.Open) throw new Error('store is not open')
    if (this.items.size >= this.capacity) throw new Error('store is full')
    this.items.set(key, value)
    this.logger?.info(`set ${key}`)
  }

  /**
   * Read a value back.
   *
   * @param key - The lookup key.
   * @returns The stored value, or `undefined` if absent.
   */
  get(key: string): T | undefined {
    return this.items.get(key)
  }
}

/**
 * Build a {@link Formatter} that pads the level name to a fixed width.
 *
 * @param width - Column width for the level label.
 * @returns A formatter.
 *
 * @public
 */
export function createFormatter(width: number): Formatter

/**
 * Build a {@link Formatter} from a template string.
 *
 * @param template - A template containing `{level}` and `{message}` tokens.
 * @returns A formatter.
 *
 * @public
 */
export function createFormatter(template: string): Formatter

export function createFormatter(widthOrTemplate: number | string): Formatter {
  if (typeof widthOrTemplate === 'number') {
    return (message, level) => `[${String(level).padStart(widthOrTemplate)}] ${message}`
  }
  return (message, level) =>
    widthOrTemplate.replace('{level}', String(level)).replace('{message}', message)
}
