/**
 * Array utility functions
 *
 * @remarks
 * Provides type-safe array manipulation utilities.
 *
 * @packageDocumentation
 */

/**
 * Groups array elements by a key selector
 *
 * @typeParam T - Array element type
 * @typeParam K - Key type (must be string | number | symbol)
 * @param array - The input array
 * @param keySelector - Function to extract the grouping key
 * @returns Object with grouped elements
 *
 * @example
 * ```typescript
 * const users = [
 *   { name: 'Alice', age: 25 },
 *   { name: 'Bob', age: 30 },
 *   { name: 'Charlie', age: 25 }
 * ]
 *
 * groupBy(users, u => u.age)
 * // { 25: [{ name: 'Alice', age: 25 }, { name: 'Charlie', age: 25 }], 30: [{ name: 'Bob', age: 30 }] }
 * ```
 *
 * @public
 */
export function groupBy<T, K extends string | number | symbol>(
  array: T[],
  keySelector: (item: T) => K
): Record<K, T[]> {
  return array.reduce(
    (result, item) => {
      const key = keySelector(item)
      if (!result[key]) {
        result[key] = []
      }
      result[key].push(item)
      return result
    },
    {} as Record<K, T[]>
  )
}

/**
 * Removes duplicate elements from an array
 *
 * @typeParam T - Array element type
 * @param array - The input array
 * @param keySelector - Optional function to extract comparison key
 * @returns Array with unique elements
 *
 * @example
 * ```typescript
 * unique([1, 2, 2, 3, 3, 3]) // [1, 2, 3]
 *
 * unique(
 *   [{ id: 1, name: 'a' }, { id: 1, name: 'b' }, { id: 2, name: 'c' }],
 *   item => item.id
 * )
 * // [{ id: 1, name: 'a' }, { id: 2, name: 'c' }]
 * ```
 *
 * @public
 */
export function unique<T>(array: T[], keySelector?: (item: T) => unknown): T[] {
  if (!keySelector) {
    return [...new Set(array)]
  }

  const seen = new Set<unknown>()
  return array.filter((item) => {
    const key = keySelector(item)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

/**
 * Chunks an array into smaller arrays of a specified size
 *
 * @typeParam T - Array element type
 * @param array - The input array
 * @param size - Size of each chunk
 * @returns Array of chunks
 *
 * @example
 * ```typescript
 * chunk([1, 2, 3, 4, 5], 2)
 * // [[1, 2], [3, 4], [5]]
 * ```
 *
 * @throws {@link Error} If size is less than 1
 *
 * @public
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size < 1) {
    throw new Error('Chunk size must be at least 1')
  }

  const result: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}

/**
 * Flattens a nested array to a specified depth
 *
 * @typeParam T - Base element type
 * @param array - The nested array
 * @param depth - Maximum depth to flatten
 * @returns Flattened array
 *
 * @example
 * ```typescript
 * flatten([1, [2, [3, [4]]]], 1) // [1, 2, [3, [4]]]
 * flatten([1, [2, [3, [4]]]], 2) // [1, 2, 3, [4]]
 * flatten([1, [2, [3, [4]]]], Infinity) // [1, 2, 3, 4]
 * ```
 *
 * @public
 */
export function flatten<T>(array: unknown[], depth = 1): T[] {
  if (depth < 1) {
    return array.slice() as T[]
  }

  return array.reduce<T[]>((result, item) => {
    if (Array.isArray(item) && depth > 0) {
      result.push(...flatten<T>(item, depth - 1))
    } else {
      result.push(item as T)
    }
    return result
  }, [])
}

/**
 * Finds the intersection of two arrays
 *
 * @typeParam T - Array element type
 * @param a - First array
 * @param b - Second array
 * @returns Array of elements present in both arrays
 *
 * @example
 * ```typescript
 * intersection([1, 2, 3], [2, 3, 4]) // [2, 3]
 * ```
 *
 * @public
 */
export function intersection<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b)
  return a.filter((item) => setB.has(item))
}

/**
 * Finds the difference between two arrays
 *
 * @typeParam T - Array element type
 * @param a - First array
 * @param b - Second array
 * @returns Elements in `a` but not in `b`
 *
 * @example
 * ```typescript
 * difference([1, 2, 3], [2, 3, 4]) // [1]
 * ```
 *
 * @public
 */
export function difference<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b)
  return a.filter((item) => !setB.has(item))
}

/**
 * Finds the union of two arrays
 *
 * @typeParam T - Array element type
 * @param a - First array
 * @param b - Second array
 * @returns Array with unique elements from both arrays
 *
 * @example
 * ```typescript
 * union([1, 2, 3], [2, 3, 4]) // [1, 2, 3, 4]
 * ```
 *
 * @public
 */
export function union<T>(a: T[], b: T[]): T[] {
  return [...new Set([...a, ...b])]
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 *
 * @typeParam T - Array element type
 * @param array - The input array
 * @returns New shuffled array (does not modify original)
 *
 * @example
 * ```typescript
 * shuffle([1, 2, 3, 4, 5]) // [3, 1, 5, 2, 4] (random order)
 * ```
 *
 * @public
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Picks a random element from an array
 *
 * @typeParam T - Array element type
 * @param array - The input array
 * @returns Random element or undefined if array is empty
 *
 * @example
 * ```typescript
 * sample([1, 2, 3, 4, 5]) // 3 (random)
 * sample([]) // undefined
 * ```
 *
 * @public
 */
export function sample<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * Picks multiple random elements from an array
 *
 * @typeParam T - Array element type
 * @param array - The input array
 * @param count - Number of elements to pick
 * @returns Array of random elements
 *
 * @example
 * ```typescript
 * sampleSize([1, 2, 3, 4, 5], 3) // [2, 4, 1] (random)
 * ```
 *
 * @public
 */
export function sampleSize<T>(array: T[], count: number): T[] {
  const shuffled = shuffle(array)
  return shuffled.slice(0, Math.min(count, array.length))
}

/**
 * Sorts an array by multiple criteria
 *
 * @typeParam T - Array element type
 * @param array - The input array
 * @param comparators - Array of comparator functions
 * @returns New sorted array
 *
 * @example
 * ```typescript
 * const users = [
 *   { name: 'Bob', age: 30 },
 *   { name: 'Alice', age: 25 },
 *   { name: 'Alice', age: 30 }
 * ]
 *
 * sortBy(users, [
 *   (a, b) => a.name.localeCompare(b.name),
 *   (a, b) => a.age - b.age
 * ])
 * // [{ name: 'Alice', age: 25 }, { name: 'Alice', age: 30 }, { name: 'Bob', age: 30 }]
 * ```
 *
 * @public
 */
export function sortBy<T>(array: T[], comparators: ((a: T, b: T) => number)[]): T[] {
  return [...array].sort((a, b) => {
    for (const comparator of comparators) {
      const result = comparator(a, b)
      if (result !== 0) return result
    }
    return 0
  })
}

/**
 * Creates an array of numbers from start to end
 *
 * @param start - Start value (inclusive)
 * @param end - End value (exclusive)
 * @param step - Step value
 * @returns Array of numbers
 *
 * @example
 * ```typescript
 * range(0, 5) // [0, 1, 2, 3, 4]
 * range(1, 10, 2) // [1, 3, 5, 7, 9]
 * range(5, 0, -1) // [5, 4, 3, 2, 1]
 * ```
 *
 * @public
 */
export function range(start: number, end: number, step = 1): number[] {
  if (step === 0) {
    throw new Error('Step cannot be zero')
  }

  const result: number[] = []
  if (step > 0) {
    for (let i = start; i < end; i += step) {
      result.push(i)
    }
  } else {
    for (let i = start; i > end; i += step) {
      result.push(i)
    }
  }
  return result
}

/**
 * Zips multiple arrays together
 *
 * @typeParam T - Tuple type of arrays
 * @param arrays - Arrays to zip
 * @returns Array of tuples
 *
 * @example
 * ```typescript
 * zip([1, 2, 3], ['a', 'b', 'c']) // [[1, 'a'], [2, 'b'], [3, 'c']]
 * zip([1, 2], ['a', 'b', 'c']) // [[1, 'a'], [2, 'b']]
 * ```
 *
 * @public
 */
export function zip<T extends unknown[][]>(...arrays: T): { [K in keyof T]: T[K] extends (infer U)[] ? U : never }[] {
  if (arrays.length === 0) return []

  const minLength = Math.min(...arrays.map((arr) => arr.length))
  const result: unknown[][] = []

  for (let i = 0; i < minLength; i++) {
    result.push(arrays.map((arr) => arr[i]))
  }

  return result as { [K in keyof T]: T[K] extends (infer U)[] ? U : never }[]
}

/**
 * Partitions an array into two arrays based on a predicate
 *
 * @typeParam T - Array element type
 * @param array - The input array
 * @param predicate - Function to test elements
 * @returns Tuple of [matching, non-matching] elements
 *
 * @example
 * ```typescript
 * partition([1, 2, 3, 4, 5], n => n % 2 === 0)
 * // [[2, 4], [1, 3, 5]]
 * ```
 *
 * @public
 */
export function partition<T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const truthy: T[] = []
  const falsy: T[] = []

  for (const item of array) {
    if (predicate(item)) {
      truthy.push(item)
    } else {
      falsy.push(item)
    }
  }

  return [truthy, falsy]
}

/**
 * Gets the first element of an array
 *
 * @typeParam T - Array element type
 * @param array - The input array
 * @returns First element or undefined
 *
 * @example
 * ```typescript
 * first([1, 2, 3]) // 1
 * first([]) // undefined
 * ```
 *
 * @public
 */
export function first<T>(array: T[]): T | undefined {
  return array[0]
}

/**
 * Gets the last element of an array
 *
 * @typeParam T - Array element type
 * @param array - The input array
 * @returns Last element or undefined
 *
 * @example
 * ```typescript
 * last([1, 2, 3]) // 3
 * last([]) // undefined
 * ```
 *
 * @public
 */
export function last<T>(array: T[]): T | undefined {
  return array[array.length - 1]
}

/**
 * Creates a lookup object from an array
 *
 * @typeParam T - Array element type
 * @typeParam K - Key type
 * @param array - The input array
 * @param keySelector - Function to extract the key
 * @returns Object mapping keys to elements
 *
 * @example
 * ```typescript
 * const users = [
 *   { id: '1', name: 'Alice' },
 *   { id: '2', name: 'Bob' }
 * ]
 *
 * keyBy(users, u => u.id)
 * // { '1': { id: '1', name: 'Alice' }, '2': { id: '2', name: 'Bob' } }
 * ```
 *
 * @public
 */
export function keyBy<T, K extends string | number | symbol>(
  array: T[],
  keySelector: (item: T) => K
): Record<K, T> {
  return array.reduce(
    (result, item) => {
      result[keySelector(item)] = item
      return result
    },
    {} as Record<K, T>
  )
}
