/**
 * Event Emitter Service
 *
 * @remarks
 * A type-safe event emitter implementation supporting
 * synchronous and asynchronous event handling.
 *
 * @packageDocumentation
 */

/**
 * Event handler function type
 *
 * @typeParam T - Event data type
 * @param data - Event data
 * @public
 */
export type EventHandler<T = unknown> = (data: T) => void | Promise<void>

/**
 * Event subscription object
 *
 * @public
 */
export interface EventSubscription {
  /** Removes the subscription */
  unsubscribe(): void
  /** Whether the subscription is active */
  readonly isActive: boolean
}

/**
 * Event listener options
 *
 * @public
 */
export interface ListenerOptions {
  /**
   * If true, the listener is automatically removed after first invocation
   * @defaultValue false
   */
  once?: boolean

  /**
   * Priority for execution order (higher = earlier)
   * @defaultValue 0
   */
  priority?: number

  /**
   * Optional context to bind to the handler
   */
  context?: unknown
}

/**
 * Internal listener storage structure
 *
 * @internal
 */
interface ListenerEntry<T> {
  handler: EventHandler<T>
  options: ListenerOptions
  id: number
}

/**
 * Type-safe event emitter class
 *
 * @remarks
 * Provides a robust event system with support for:
 * - Typed events with type inference
 * - One-time listeners
 * - Priority-based execution
 * - Async event handlers
 * - Wildcard event listening
 *
 * @typeParam TEvents - Event map type defining event names and data types
 *
 * @example
 * Define typed events:
 * ```typescript
 * interface MyEvents {
 *   'user:login': { userId: string; timestamp: Date }
 *   'user:logout': { userId: string }
 *   'error': Error
 *   'ready': void
 * }
 *
 * const emitter = new EventEmitter<MyEvents>()
 * ```
 *
 * @example
 * Subscribe to events:
 * ```typescript
 * // Type-safe event subscription
 * emitter.on('user:login', (data) => {
 *   console.log(`User ${data.userId} logged in at ${data.timestamp}`)
 * })
 *
 * // One-time listener
 * emitter.once('ready', () => {
 *   console.log('Application is ready!')
 * })
 *
 * // Priority listener (executes first)
 * emitter.on('error', (error) => {
 *   console.error('Critical error:', error)
 * }, { priority: 100 })
 * ```
 *
 * @example
 * Emit events:
 * ```typescript
 * emitter.emit('user:login', {
 *   userId: 'user-123',
 *   timestamp: new Date()
 * })
 *
 * emitter.emit('ready')
 * ```
 *
 * @public
 */
export class EventEmitter<TEvents extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Map of event names to listener arrays
   * @internal
   */
  private listeners: Map<keyof TEvents | '*', ListenerEntry<unknown>[]> = new Map()

  /**
   * Counter for generating unique listener IDs
   * @internal
   */
  private nextListenerId = 0

  /**
   * Maximum number of listeners per event (0 = unlimited)
   */
  private maxListeners = 0

  /**
   * Sets the maximum number of listeners per event
   *
   * @param max - Maximum listeners (0 for unlimited)
   * @returns This emitter for chaining
   *
   * @example
   * ```typescript
   * emitter.setMaxListeners(10)
   * ```
   */
  public setMaxListeners(max: number): this {
    this.maxListeners = max
    return this
  }

  /**
   * Gets the maximum number of listeners per event
   *
   * @returns Maximum listeners count
   */
  public getMaxListeners(): number {
    return this.maxListeners
  }

  /**
   * Adds an event listener
   *
   * @typeParam K - Event name type
   * @param event - Event name to listen for
   * @param handler - Handler function
   * @param options - Listener options
   * @returns Subscription object for unsubscribing
   *
   * @example
   * ```typescript
   * const subscription = emitter.on('user:login', (data) => {
   *   console.log(data.userId)
   * })
   *
   * // Later: remove the listener
   * subscription.unsubscribe()
   * ```
   */
  public on<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>,
    options: ListenerOptions = {}
  ): EventSubscription {
    return this.addListener(event, handler, options)
  }

  /**
   * Adds a one-time event listener
   *
   * @typeParam K - Event name type
   * @param event - Event name to listen for
   * @param handler - Handler function
   * @param options - Listener options (once is automatically set to true)
   * @returns Subscription object
   *
   * @example
   * ```typescript
   * emitter.once('ready', () => {
   *   console.log('This runs only once!')
   * })
   * ```
   */
  public once<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>,
    options: ListenerOptions = {}
  ): EventSubscription {
    return this.addListener(event, handler, { ...options, once: true })
  }

  /**
   * Removes an event listener
   *
   * @typeParam K - Event name type
   * @param event - Event name
   * @param handler - Handler function to remove
   * @returns True if a listener was removed
   */
  public off<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): boolean {
    const eventListeners = this.listeners.get(event)
    if (!eventListeners) return false

    const index = eventListeners.findIndex((l) => l.handler === handler)
    if (index !== -1) {
      eventListeners.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Emits an event to all listeners
   *
   * @typeParam K - Event name type
   * @param event - Event name to emit
   * @param data - Event data
   * @returns True if event had listeners
   *
   * @example
   * ```typescript
   * emitter.emit('user:login', {
   *   userId: 'user-123',
   *   timestamp: new Date()
   * })
   * ```
   */
  public emit<K extends keyof TEvents>(
    event: K,
    ...args: TEvents[K] extends void ? [] : [data: TEvents[K]]
  ): boolean {
    const data = args[0]
    const eventListeners = this.listeners.get(event) ?? []
    const wildcardListeners = this.listeners.get('*') ?? []

    const allListeners = [...eventListeners, ...wildcardListeners].sort(
      (a, b) => (b.options.priority ?? 0) - (a.options.priority ?? 0)
    )

    if (allListeners.length === 0) return false

    const toRemove: ListenerEntry<unknown>[] = []

    for (const listener of allListeners) {
      const context = listener.options.context
      const handler = listener.handler

      if (context) {
        handler.call(context, data)
      } else {
        handler(data)
      }

      if (listener.options.once) {
        toRemove.push(listener)
      }
    }

    // Remove one-time listeners
    for (const listener of toRemove) {
      this.removeListenerById(event, listener.id)
    }

    return true
  }

  /**
   * Emits an event and waits for all async handlers
   *
   * @typeParam K - Event name type
   * @param event - Event name to emit
   * @param data - Event data
   * @returns Promise that resolves when all handlers complete
   *
   * @example
   * ```typescript
   * await emitter.emitAsync('data:save', { records: [...] })
   * console.log('All save handlers completed!')
   * ```
   */
  public async emitAsync<K extends keyof TEvents>(
    event: K,
    ...args: TEvents[K] extends void ? [] : [data: TEvents[K]]
  ): Promise<boolean> {
    const data = args[0]
    const eventListeners = this.listeners.get(event) ?? []
    const wildcardListeners = this.listeners.get('*') ?? []

    const allListeners = [...eventListeners, ...wildcardListeners].sort(
      (a, b) => (b.options.priority ?? 0) - (a.options.priority ?? 0)
    )

    if (allListeners.length === 0) return false

    const toRemove: ListenerEntry<unknown>[] = []
    const promises: Promise<void>[] = []

    for (const listener of allListeners) {
      const context = listener.options.context
      const handler = listener.handler

      const result = context ? handler.call(context, data) : handler(data)

      if (result instanceof Promise) {
        promises.push(result)
      }

      if (listener.options.once) {
        toRemove.push(listener)
      }
    }

    await Promise.all(promises)

    // Remove one-time listeners
    for (const listener of toRemove) {
      this.removeListenerById(event, listener.id)
    }

    return true
  }

  /**
   * Gets the number of listeners for an event
   *
   * @param event - Event name
   * @returns Number of listeners
   */
  public listenerCount<K extends keyof TEvents>(event: K): number {
    return this.listeners.get(event)?.length ?? 0
  }

  /**
   * Gets all event names with listeners
   *
   * @returns Array of event names
   */
  public eventNames(): (keyof TEvents)[] {
    return Array.from(this.listeners.keys()) as (keyof TEvents)[]
  }

  /**
   * Removes all listeners for an event or all events
   *
   * @param event - Optional event name (if omitted, removes all)
   * @returns This emitter for chaining
   */
  public removeAllListeners<K extends keyof TEvents>(event?: K): this {
    if (event !== undefined) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
    return this
  }

  /**
   * Adds a wildcard listener that receives all events
   *
   * @param handler - Handler function
   * @param options - Listener options
   * @returns Subscription object
   *
   * @example
   * ```typescript
   * emitter.onAny((data) => {
   *   console.log('Event emitted:', data)
   * })
   * ```
   */
  public onAny(handler: EventHandler<unknown>, options: ListenerOptions = {}): EventSubscription {
    return this.addListener('*' as keyof TEvents, handler as EventHandler<TEvents[keyof TEvents]>, options)
  }

  /**
   * Waits for an event to be emitted
   *
   * @typeParam K - Event name type
   * @param event - Event to wait for
   * @param timeout - Optional timeout in milliseconds
   * @returns Promise resolving to the event data
   * @throws {@link Error} If timeout is reached
   *
   * @example
   * ```typescript
   * const loginData = await emitter.waitFor('user:login', 5000)
   * console.log('User logged in:', loginData.userId)
   * ```
   */
  public waitFor<K extends keyof TEvents>(event: K, timeout?: number): Promise<TEvents[K]> {
    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined

      const subscription = this.once(event, ((data: TEvents[K]) => {
        if (timeoutId) clearTimeout(timeoutId)
        resolve(data)
      }) as EventHandler<TEvents[K]>)

      if (timeout !== undefined) {
        timeoutId = setTimeout(() => {
          subscription.unsubscribe()
          reject(new Error(`Timeout waiting for event: ${String(event)}`))
        }, timeout)
      }
    })
  }

  /**
   * Internal method to add a listener
   *
   * @internal
   */
  private addListener<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>,
    options: ListenerOptions
  ): EventSubscription {
    let eventListeners = this.listeners.get(event)
    if (!eventListeners) {
      eventListeners = []
      this.listeners.set(event, eventListeners)
    }

    if (this.maxListeners > 0 && eventListeners.length >= this.maxListeners) {
      console.warn(`MaxListenersExceededWarning: Possible memory leak detected. ${eventListeners.length} listeners added for event "${String(event)}"`)
    }

    const id = this.nextListenerId++
    const entry: ListenerEntry<TEvents[K]> = {
      handler,
      options,
      id,
    }

    eventListeners.push(entry as ListenerEntry<unknown>)

    let isActive = true
    return {
      unsubscribe: () => {
        if (isActive) {
          this.removeListenerById(event, id)
          isActive = false
        }
      },
      get isActive() {
        return isActive
      },
    }
  }

  /**
   * Removes a listener by its internal ID
   *
   * @internal
   */
  private removeListenerById<K extends keyof TEvents>(event: K, id: number): void {
    const eventListeners = this.listeners.get(event)
    if (!eventListeners) return

    const index = eventListeners.findIndex((l) => l.id === id)
    if (index !== -1) {
      eventListeners.splice(index, 1)
    }
  }
}

/**
 * Creates a new EventEmitter instance
 *
 * @typeParam TEvents - Event map type
 * @returns New EventEmitter instance
 *
 * @example
 * ```typescript
 * interface AppEvents {
 *   'start': void
 *   'stop': { reason: string }
 * }
 *
 * const events = createEventEmitter<AppEvents>()
 * events.on('stop', ({ reason }) => console.log(reason))
 * ```
 *
 * @public
 */
export function createEventEmitter<
  TEvents extends Record<string, unknown> = Record<string, unknown>
>(): EventEmitter<TEvents> {
  return new EventEmitter<TEvents>()
}
