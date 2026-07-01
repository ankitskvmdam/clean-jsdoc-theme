/**
 * Common type definitions
 *
 * @remarks
 * A collection of utility types for common TypeScript patterns.
 *
 * @packageDocumentation
 */

/**
 * Makes all properties of T optional and nullable
 *
 * @typeParam T - The base type
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string
 *   name: string
 *   age: number
 * }
 *
 * type PartialNullableUser = Nullable<User>
 * // { id?: string | null; name?: string | null; age?: number | null }
 * ```
 *
 * @public
 */
export type Nullable<T> = {
  [P in keyof T]?: T[P] | null
}

/**
 * Makes specific properties of T required
 *
 * @typeParam T - The base type
 * @typeParam K - Keys to make required
 *
 * @example
 * ```typescript
 * interface Config {
 *   host?: string
 *   port?: number
 *   debug?: boolean
 * }
 *
 * type RequiredConfig = RequiredKeys<Config, 'host' | 'port'>
 * // { host: string; port: number; debug?: boolean }
 * ```
 *
 * @public
 */
export type RequiredKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

/**
 * Makes specific properties of T optional
 *
 * @typeParam T - The base type
 * @typeParam K - Keys to make optional
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string
 *   name: string
 *   email: string
 * }
 *
 * type CreateUserInput = OptionalKeys<User, 'id'>
 * // { id?: string; name: string; email: string }
 * ```
 *
 * @public
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Deep partial - makes all nested properties optional
 *
 * @typeParam T - The base type
 *
 * @example
 * ```typescript
 * interface Config {
 *   server: {
 *     host: string
 *     port: number
 *   }
 *   features: {
 *     enabled: boolean
 *   }
 * }
 *
 * type PartialConfig = DeepPartial<Config>
 * // All nested properties are optional
 * ```
 *
 * @public
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>
    }
  : T

/**
 * Deep readonly - makes all nested properties readonly
 *
 * @typeParam T - The base type
 *
 * @example
 * ```typescript
 * interface State {
 *   user: { name: string }
 *   items: string[]
 * }
 *
 * const state: DeepReadonly<State> = { user: { name: 'Alice' }, items: [] }
 * // state.user.name = 'Bob' // Error!
 * ```
 *
 * @public
 */
export type DeepReadonly<T> = T extends (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends object
    ? {
        readonly [P in keyof T]: DeepReadonly<T[P]>
      }
    : T

/**
 * Extracts the element type from an array type
 *
 * @typeParam T - Array type
 *
 * @example
 * ```typescript
 * type Item = ArrayElement<string[]> // string
 * type User = ArrayElement<User[]> // User
 * ```
 *
 * @public
 */
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never

/**
 * Extracts the resolved type from a Promise
 *
 * @typeParam T - Promise type
 *
 * @example
 * ```typescript
 * type Result = Awaited<Promise<string>> // string
 * type Data = Awaited<Promise<Promise<number>>> // number
 * ```
 *
 * @public
 */
export type PromiseValue<T> = T extends Promise<infer U> ? PromiseValue<U> : T

/**
 * Function type with specific argument and return types
 *
 * @typeParam Args - Tuple of argument types
 * @typeParam Return - Return type
 *
 * @example
 * ```typescript
 * type AddFn = Fn<[number, number], number>
 * const add: AddFn = (a, b) => a + b
 * ```
 *
 * @public
 */
export type Fn<Args extends unknown[] = unknown[], Return = unknown> = (...args: Args) => Return

/**
 * Async function type
 *
 * @typeParam Args - Tuple of argument types
 * @typeParam Return - Return type (will be wrapped in Promise)
 *
 * @example
 * ```typescript
 * type FetchUser = AsyncFn<[string], User>
 * const fetchUser: FetchUser = async (id) => { ... }
 * ```
 *
 * @public
 */
export type AsyncFn<Args extends unknown[] = unknown[], Return = unknown> = (
  ...args: Args
) => Promise<Return>

/**
 * Constructor type
 *
 * @typeParam T - Instance type
 * @typeParam Args - Constructor argument types
 *
 * @example
 * ```typescript
 * type UserConstructor = Constructor<User, [string, number]>
 * ```
 *
 * @public
 */
export type Constructor<T = unknown, Args extends unknown[] = unknown[]> = new (...args: Args) => T

/**
 * Extracts keys of T that have values assignable to V
 *
 * @typeParam T - Object type
 * @typeParam V - Value type to match
 *
 * @example
 * ```typescript
 * interface User {
 *   id: number
 *   name: string
 *   email: string
 *   age: number
 * }
 *
 * type StringKeys = KeysOfType<User, string> // 'name' | 'email'
 * type NumberKeys = KeysOfType<User, number> // 'id' | 'age'
 * ```
 *
 * @public
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never
}[keyof T]

/**
 * Removes keys with never type
 *
 * @typeParam T - Object type
 *
 * @public
 */
export type NonNeverKeys<T> = {
  [K in keyof T]: T[K] extends never ? never : K
}[keyof T]

/**
 * Picks properties of T that have values assignable to V
 *
 * @typeParam T - Object type
 * @typeParam V - Value type to match
 *
 * @example
 * ```typescript
 * interface Mixed {
 *   count: number
 *   name: string
 *   active: boolean
 *   score: number
 * }
 *
 * type NumberProps = PickByType<Mixed, number>
 * // { count: number; score: number }
 * ```
 *
 * @public
 */
export type PickByType<T, V> = Pick<T, KeysOfType<T, V>>

/**
 * Omits properties of T that have values assignable to V
 *
 * @typeParam T - Object type
 * @typeParam V - Value type to exclude
 *
 * @public
 */
export type OmitByType<T, V> = Omit<T, KeysOfType<T, V>>

/**
 * Makes all properties mutable (removes readonly)
 *
 * @typeParam T - Object type
 *
 * @example
 * ```typescript
 * interface Config {
 *   readonly apiKey: string
 *   readonly endpoint: string
 * }
 *
 * type MutableConfig = Mutable<Config>
 * // { apiKey: string; endpoint: string }
 * ```
 *
 * @public
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}

/**
 * Union to intersection type conversion
 *
 * @typeParam U - Union type
 *
 * @example
 * ```typescript
 * type A = { a: string }
 * type B = { b: number }
 * type AB = UnionToIntersection<A | B>
 * // { a: string } & { b: number }
 * ```
 *
 * @public
 */
export type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

/**
 * Strict union type (no extra properties)
 *
 * @typeParam T - Union of object types
 *
 * @public
 */
export type StrictUnion<T> = T extends object
  ? T & { [K in Exclude<keyof UnionToIntersection<T>, keyof T>]?: never }
  : T

/**
 * Value type of a record/object
 *
 * @typeParam T - Object type
 *
 * @example
 * ```typescript
 * type Config = { port: number; host: string; debug: boolean }
 * type ConfigValue = ValueOf<Config> // number | string | boolean
 * ```
 *
 * @public
 */
export type ValueOf<T> = T[keyof T]

/**
 * Branded/tagged type for nominal typing
 *
 * @typeParam T - Base type
 * @typeParam Brand - Brand identifier
 *
 * @example
 * ```typescript
 * type UserId = Brand<string, 'UserId'>
 * type OrderId = Brand<string, 'OrderId'>
 *
 * const userId: UserId = 'user-123' as UserId
 * const orderId: OrderId = 'order-456' as OrderId
 *
 * // userId = orderId // Error! Types are incompatible
 * ```
 *
 * @public
 */
export type Brand<T, Brand extends string> = T & { readonly __brand: Brand }

/**
 * Extracts string literal union from const array
 *
 * @typeParam T - Readonly array type
 *
 * @example
 * ```typescript
 * const colors = ['red', 'green', 'blue'] as const
 * type Color = TupleToUnion<typeof colors> // 'red' | 'green' | 'blue'
 * ```
 *
 * @public
 */
export type TupleToUnion<T extends readonly unknown[]> = T[number]

/**
 * Utility type for exhaustive switch statements
 *
 * @param x - Value that should be never
 *
 * @example
 * ```typescript
 * type Status = 'pending' | 'active' | 'done'
 *
 * function handleStatus(status: Status): string {
 *   switch (status) {
 *     case 'pending': return 'Waiting...'
 *     case 'active': return 'In progress'
 *     case 'done': return 'Completed'
 *     default: return assertNever(status)
 *   }
 * }
 * ```
 *
 * @public
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`)
}

/**
 * Type guard helper for checking if value is defined
 *
 * @typeParam T - Value type
 * @param value - Value to check
 * @returns True if value is not null or undefined
 *
 * @example
 * ```typescript
 * const values = [1, null, 2, undefined, 3]
 * const defined = values.filter(isDefined) // [1, 2, 3]
 * ```
 *
 * @public
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Type guard for checking if value is a specific type
 *
 * @typeParam T - Expected type
 * @param value - Value to check
 * @param check - Type checking function
 * @returns True if value passes the check
 *
 * @public
 */
export function isType<T>(value: unknown, check: (value: unknown) => boolean): value is T {
  return check(value)
}
