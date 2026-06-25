/**
 * Cache Service
 *
 * @remarks
 * Provides in-memory caching with TTL support, eviction policies,
 * and cache statistics.
 *
 * @packageDocumentation
 */

/**
 * Cache entry metadata
 *
 * @typeParam T - Cached value type
 * @public
 */
export interface CacheEntry<T> {
  /** Cached value */
  value: T
  /** Creation timestamp */
  createdAt: number
  /** Last access timestamp */
  lastAccessedAt: number
  /** Expiration timestamp (undefined = no expiry) */
  expiresAt?: number
  /** Number of times accessed */
  hits: number
  /** Size in bytes (approximate) */
  size: number
}

/**
 * Cache configuration options
 *
 * @public
 */
export interface CacheOptions {
  /**
   * Maximum number of entries
   * @defaultValue 1000
   */
  maxSize?: number

  /**
   * Default TTL in milliseconds
   * @defaultValue undefined (no expiry)
   */
  defaultTtl?: number

  /**
   * Eviction policy when cache is full
   * @defaultValue 'lru'
   */
  evictionPolicy?: 'lru' | 'lfu' | 'fifo'

  /**
   * Whether to clone values on get/set
   * @defaultValue false
   */
  cloneValues?: boolean

  /**
   * Interval for checking expired entries (ms)
   * @defaultValue 60000
   */
  cleanupInterval?: number
}

/**
 * Cache statistics
 *
 * @public
 */
export interface CacheStats {
  /** Total number of entries */
  entries: number
  /** Total cache hits */
  hits: number
  /** Total cache misses */
  misses: number
  /** Hit rate (0-1) */
  hitRate: number
  /** Total evictions */
  evictions: number
  /** Approximate memory usage in bytes */
  memoryUsage: number
  /** Cache uptime in milliseconds */
  uptime: number
}

/**
 * Generic cache implementation
 *
 * @remarks
 * A feature-rich caching solution with:
 * - Configurable TTL (Time To Live)
 * - Multiple eviction policies (LRU, LFU, FIFO)
 * - Automatic cleanup of expired entries
 * - Cache statistics and monitoring
 * - Namespace support for logical grouping
 *
 * @typeParam K - Key type
 * @typeParam V - Value type
 *
 * @example
 * Basic usage:
 * ```typescript
 * const cache = new Cache<string, User>({
 *   maxSize: 100,
 *   defaultTtl: 5 * 60 * 1000 // 5 minutes
 * })
 *
 * // Set a value
 * cache.set('user:123', { id: '123', name: 'John' })
 *
 * // Get a value
 * const user = cache.get('user:123')
 *
 * // Check if exists
 * if (cache.has('user:123')) {
 *   // ...
 * }
 * ```
 *
 * @example
 * With custom TTL:
 * ```typescript
 * // Cache for 1 hour
 * cache.set('session:abc', sessionData, { ttl: 60 * 60 * 1000 })
 *
 * // No expiry
 * cache.set('config', configData, { ttl: 0 })
 * ```
 *
 * @example
 * Using getOrSet pattern:
 * ```typescript
 * const user = await cache.getOrSet('user:123', async () => {
 *   return await fetchUserFromDatabase('123')
 * })
 * ```
 *
 * @public
 */
export class Cache<K = string, V = unknown> {
  /**
   * Internal cache storage
   * @internal
   */
  private storage: Map<K, CacheEntry<V>> = new Map()

  /**
   * Cache configuration
   */
  private readonly options: Required<CacheOptions>

  /**
   * Statistics counters
   */
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  }

  /**
   * Cache creation timestamp
   */
  private readonly createdAt: number

  /**
   * Cleanup timer reference
   */
  private cleanupTimer?: ReturnType<typeof setInterval>

  /**
   * Creates a new Cache instance
   *
   * @param options - Cache configuration options
   *
   * @example
   * ```typescript
   * const cache = new Cache({
   *   maxSize: 500,
   *   defaultTtl: 300000,
   *   evictionPolicy: 'lru'
   * })
   * ```
   */
  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 1000,
      defaultTtl: options.defaultTtl ?? 0,
      evictionPolicy: options.evictionPolicy ?? 'lru',
      cloneValues: options.cloneValues ?? false,
      cleanupInterval: options.cleanupInterval ?? 60000,
    }
    this.createdAt = Date.now()

    // Start cleanup timer if TTL is used
    if (this.options.defaultTtl > 0 || this.options.cleanupInterval > 0) {
      this.startCleanupTimer()
    }
  }

  /**
   * Gets the current size of the cache
   */
  public get size(): number {
    return this.storage.size
  }

  /**
   * Gets a value from the cache
   *
   * @param key - Cache key
   * @returns Cached value or undefined if not found/expired
   *
   * @example
   * ```typescript
   * const value = cache.get('myKey')
   * if (value !== undefined) {
   *   console.log('Found:', value)
   * }
   * ```
   */
  public get(key: K): V | undefined {
    const entry = this.storage.get(key)

    if (!entry) {
      this.stats.misses++
      return undefined
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.storage.delete(key)
      this.stats.misses++
      return undefined
    }

    // Update access metadata
    entry.lastAccessedAt = Date.now()
    entry.hits++
    this.stats.hits++

    return this.options.cloneValues ? this.clone(entry.value) : entry.value
  }

  /**
   * Sets a value in the cache
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Optional settings for this entry
   * @returns This cache instance for chaining
   *
   * @example
   * ```typescript
   * cache
   *   .set('key1', 'value1')
   *   .set('key2', 'value2', { ttl: 60000 })
   * ```
   */
  public set(key: K, value: V, options?: { ttl?: number }): this {
    // Evict if at capacity
    if (this.storage.size >= this.options.maxSize && !this.storage.has(key)) {
      this.evict()
    }

    const now = Date.now()
    const ttl = options?.ttl ?? this.options.defaultTtl

    const entry: CacheEntry<V> = {
      value: this.options.cloneValues ? this.clone(value) : value,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: ttl > 0 ? now + ttl : undefined,
      hits: 0,
      size: this.estimateSize(value),
    }

    this.storage.set(key, entry)
    return this
  }

  /**
   * Gets a value, setting it if not present
   *
   * @typeParam T - Value type (extends V)
   * @param key - Cache key
   * @param factory - Function to create value if not cached
   * @param options - Optional cache settings
   * @returns The cached or newly created value
   *
   * @example
   * ```typescript
   * const user = await cache.getOrSet(
   *   'user:123',
   *   async () => await db.users.find('123'),
   *   { ttl: 300000 }
   * )
   * ```
   */
  public async getOrSet<T extends V>(
    key: K,
    factory: () => T | Promise<T>,
    options?: { ttl?: number }
  ): Promise<T> {
    const existing = this.get(key)
    if (existing !== undefined) {
      return existing as T
    }

    const value = await factory()
    this.set(key, value, options)
    return value
  }

  /**
   * Checks if a key exists and is not expired
   *
   * @param key - Cache key
   * @returns True if key exists and is valid
   */
  public has(key: K): boolean {
    const entry = this.storage.get(key)
    if (!entry) return false

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.storage.delete(key)
      return false
    }

    return true
  }

  /**
   * Deletes a value from the cache
   *
   * @param key - Cache key
   * @returns True if the key was deleted
   */
  public delete(key: K): boolean {
    return this.storage.delete(key)
  }

  /**
   * Clears all entries from the cache
   *
   * @returns This cache instance for chaining
   */
  public clear(): this {
    this.storage.clear()
    return this
  }

  /**
   * Gets all keys in the cache
   *
   * @returns Array of keys
   */
  public keys(): K[] {
    return Array.from(this.storage.keys())
  }

  /**
   * Gets all values in the cache
   *
   * @returns Array of values
   */
  public values(): V[] {
    return Array.from(this.storage.values())
      .filter((entry) => !entry.expiresAt || Date.now() <= entry.expiresAt)
      .map((entry) => entry.value)
  }

  /**
   * Gets all entries as key-value pairs
   *
   * @returns Array of [key, value] tuples
   */
  public entries(): [K, V][] {
    const result: [K, V][] = []
    for (const [key, entry] of this.storage) {
      if (!entry.expiresAt || Date.now() <= entry.expiresAt) {
        result.push([key, entry.value])
      }
    }
    return result
  }

  /**
   * Gets cache statistics
   *
   * @returns Current cache statistics
   *
   * @example
   * ```typescript
   * const stats = cache.getStats()
   * console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`)
   * console.log(`Memory: ${stats.memoryUsage} bytes`)
   * ```
   */
  public getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    let memoryUsage = 0

    for (const entry of this.storage.values()) {
      memoryUsage += entry.size
    }

    return {
      entries: this.storage.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      evictions: this.stats.evictions,
      memoryUsage,
      uptime: Date.now() - this.createdAt,
    }
  }

  /**
   * Updates the TTL for an existing entry
   *
   * @param key - Cache key
   * @param ttl - New TTL in milliseconds
   * @returns True if entry was updated
   */
  public touch(key: K, ttl?: number): boolean {
    const entry = this.storage.get(key)
    if (!entry) return false

    const newTtl = ttl ?? this.options.defaultTtl
    entry.expiresAt = newTtl > 0 ? Date.now() + newTtl : undefined
    return true
  }

  /**
   * Iterates over cache entries
   *
   * @param callback - Function called for each entry
   *
   * @example
   * ```typescript
   * cache.forEach((value, key, entry) => {
   *   console.log(`${key}: ${value} (hits: ${entry.hits})`)
   * })
   * ```
   */
  public forEach(callback: (value: V, key: K, entry: CacheEntry<V>) => void): void {
    for (const [key, entry] of this.storage) {
      if (!entry.expiresAt || Date.now() <= entry.expiresAt) {
        callback(entry.value, key, entry)
      }
    }
  }

  /**
   * Destroys the cache and cleans up resources
   */
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.storage.clear()
  }

  /**
   * Evicts entries based on the configured policy
   *
   * @internal
   */
  private evict(): void {
    if (this.storage.size === 0) return

    let keyToEvict: K | undefined
    let targetEntry: CacheEntry<V> | undefined

    switch (this.options.evictionPolicy) {
      case 'lru': // Least Recently Used
        for (const [key, entry] of this.storage) {
          if (!targetEntry || entry.lastAccessedAt < targetEntry.lastAccessedAt) {
            keyToEvict = key
            targetEntry = entry
          }
        }
        break

      case 'lfu': // Least Frequently Used
        for (const [key, entry] of this.storage) {
          if (!targetEntry || entry.hits < targetEntry.hits) {
            keyToEvict = key
            targetEntry = entry
          }
        }
        break

      case 'fifo': // First In First Out
        for (const [key, entry] of this.storage) {
          if (!targetEntry || entry.createdAt < targetEntry.createdAt) {
            keyToEvict = key
            targetEntry = entry
          }
        }
        break
    }

    if (keyToEvict !== undefined) {
      this.storage.delete(keyToEvict)
      this.stats.evictions++
    }
  }

  /**
   * Starts the cleanup timer
   *
   * @internal
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.options.cleanupInterval)
  }

  /**
   * Removes expired entries
   *
   * @internal
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.storage) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.storage.delete(key)
      }
    }
  }

  /**
   * Estimates the size of a value in bytes
   *
   * @internal
   */
  private estimateSize(value: V): number {
    try {
      return JSON.stringify(value).length * 2 // Rough estimate
    } catch {
      return 0
    }
  }

  /**
   * Clones a value
   *
   * @internal
   */
  private clone(value: V): V {
    return JSON.parse(JSON.stringify(value))
  }
}

/**
 * Creates a namespace-prefixed cache wrapper
 *
 * @typeParam V - Value type
 * @param cache - Base cache instance
 * @param namespace - Namespace prefix
 * @returns Namespaced cache wrapper
 *
 * @example
 * ```typescript
 * const baseCache = new Cache<string, unknown>()
 * const userCache = createNamespacedCache(baseCache, 'users')
 *
 * userCache.set('123', userData) // Actually stores as 'users:123'
 * userCache.get('123') // Retrieves from 'users:123'
 * ```
 *
 * @public
 */
export function createNamespacedCache<V>(
  cache: Cache<string, V>,
  namespace: string
): {
  get: (key: string) => V | undefined
  set: (key: string, value: V, options?: { ttl?: number }) => void
  delete: (key: string) => boolean
  has: (key: string) => boolean
} {
  const prefix = `${namespace}:`

  return {
    get: (key: string) => cache.get(`${prefix}${key}`),
    set: (key: string, value: V, options?: { ttl?: number }) => {
      cache.set(`${prefix}${key}`, value, options)
    },
    delete: (key: string) => cache.delete(`${prefix}${key}`),
    has: (key: string) => cache.has(`${prefix}${key}`),
  }
}
