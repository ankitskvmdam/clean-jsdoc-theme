/**
 * API related type definitions
 *
 * @remarks
 * Types for building type-safe API clients and servers.
 *
 * @packageDocumentation
 */

/**
 * HTTP status codes
 *
 * @public
 */
export const HTTP_STATUS = {
  /** Request succeeded */
  OK: 200,
  /** Resource created */
  CREATED: 201,
  /** Request accepted for processing */
  ACCEPTED: 202,
  /** No content to return */
  NO_CONTENT: 204,

  /** Moved permanently */
  MOVED_PERMANENTLY: 301,
  /** Resource found elsewhere */
  FOUND: 302,
  /** See other location */
  SEE_OTHER: 303,
  /** Not modified since last request */
  NOT_MODIFIED: 304,

  /** Bad request syntax */
  BAD_REQUEST: 400,
  /** Authentication required */
  UNAUTHORIZED: 401,
  /** Payment required */
  PAYMENT_REQUIRED: 402,
  /** Access forbidden */
  FORBIDDEN: 403,
  /** Resource not found */
  NOT_FOUND: 404,
  /** Method not allowed */
  METHOD_NOT_ALLOWED: 405,
  /** Request conflict */
  CONFLICT: 409,
  /** Resource gone permanently */
  GONE: 410,
  /** Validation failed */
  UNPROCESSABLE_ENTITY: 422,
  /** Too many requests */
  TOO_MANY_REQUESTS: 429,

  /** Internal server error */
  INTERNAL_SERVER_ERROR: 500,
  /** Not implemented */
  NOT_IMPLEMENTED: 501,
  /** Bad gateway */
  BAD_GATEWAY: 502,
  /** Service unavailable */
  SERVICE_UNAVAILABLE: 503,
  /** Gateway timeout */
  GATEWAY_TIMEOUT: 504,
} as const

/**
 * HTTP status code type
 *
 * @public
 */
export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS]

/**
 * API success response wrapper
 *
 * @typeParam T - Data type
 *
 * @example
 * ```typescript
 * type UserResponse = ApiSuccessResponse<User>
 * // { success: true; data: User; meta?: ResponseMeta }
 * ```
 *
 * @public
 */
export interface ApiSuccessResponse<T> {
  /** Always true for success responses */
  success: true
  /** Response data */
  data: T
  /** Optional metadata */
  meta?: ResponseMeta
}

/**
 * API error response wrapper
 *
 * @example
 * ```typescript
 * const error: ApiErrorResponse = {
 *   success: false,
 *   error: {
 *     code: 'VALIDATION_ERROR',
 *     message: 'Invalid email format',
 *     details: [{ field: 'email', message: 'Must be a valid email' }]
 *   }
 * }
 * ```
 *
 * @public
 */
export interface ApiErrorResponse {
  /** Always false for error responses */
  success: false
  /** Error details */
  error: ApiError
}

/**
 * Combined API response type
 *
 * @typeParam T - Success data type
 *
 * @example
 * ```typescript
 * async function fetchUser(id: string): Promise<ApiResponse<User>> {
 *   const response = await api.get(`/users/${id}`)
 *   if (response.success) {
 *     console.log(response.data.name)
 *   } else {
 *     console.error(response.error.message)
 *   }
 *   return response
 * }
 * ```
 *
 * @public
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * API error details
 *
 * @public
 */
export interface ApiError {
  /** Error code (machine-readable) */
  code: string
  /** Error message (human-readable) */
  message: string
  /** HTTP status code */
  status?: HttpStatusCode
  /** Additional error details */
  details?: ErrorDetail[]
  /** Stack trace (development only) */
  stack?: string
}

/**
 * Individual error detail
 *
 * @public
 */
export interface ErrorDetail {
  /** Field name that caused the error */
  field?: string
  /** Error message for this field */
  message: string
  /** Error code for this detail */
  code?: string
}

/**
 * Response metadata
 *
 * @public
 */
export interface ResponseMeta {
  /** Request ID for tracing */
  requestId?: string
  /** Response timestamp */
  timestamp?: string
  /** API version */
  version?: string
  /** Additional metadata */
  [key: string]: unknown
}

/**
 * Pagination request parameters
 *
 * @public
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page?: number
  /** Items per page */
  limit?: number
  /** Cursor for cursor-based pagination */
  cursor?: string
}

/**
 * Pagination response metadata
 *
 * @public
 */
export interface PaginationMeta {
  /** Current page number */
  page: number
  /** Items per page */
  limit: number
  /** Total number of items */
  total: number
  /** Total number of pages */
  totalPages: number
  /** Whether there is a next page */
  hasNextPage: boolean
  /** Whether there is a previous page */
  hasPreviousPage: boolean
  /** Cursor for next page (cursor-based) */
  nextCursor?: string
  /** Cursor for previous page (cursor-based) */
  previousCursor?: string
}

/**
 * Paginated API response
 *
 * @typeParam T - Item type
 *
 * @example
 * ```typescript
 * const response: PaginatedResponse<User> = {
 *   success: true,
 *   data: [user1, user2, user3],
 *   pagination: {
 *     page: 1,
 *     limit: 10,
 *     total: 100,
 *     totalPages: 10,
 *     hasNextPage: true,
 *     hasPreviousPage: false
 *   }
 * }
 * ```
 *
 * @public
 */
export interface PaginatedResponse<T> {
  /** Success flag */
  success: true
  /** Array of items */
  data: T[]
  /** Pagination metadata */
  pagination: PaginationMeta
  /** Additional metadata */
  meta?: ResponseMeta
}

/**
 * Sort order
 *
 * @public
 */
export type SortOrder = 'asc' | 'desc'

/**
 * Sort parameter
 *
 * @typeParam T - Object type being sorted
 *
 * @public
 */
export interface SortParam<T> {
  /** Field to sort by */
  field: keyof T
  /** Sort direction */
  order: SortOrder
}

/**
 * Filter operator
 *
 * @public
 */
export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'contains'
  | 'startsWith'
  | 'endsWith'

/**
 * Filter parameter
 *
 * @typeParam T - Object type being filtered
 *
 * @public
 */
export interface FilterParam<T> {
  /** Field to filter on */
  field: keyof T
  /** Filter operator */
  operator: FilterOperator
  /** Filter value */
  value: unknown
}

/**
 * Query parameters for list endpoints
 *
 * @typeParam T - Item type
 *
 * @example
 * ```typescript
 * const query: QueryParams<User> = {
 *   page: 1,
 *   limit: 20,
 *   sort: [{ field: 'createdAt', order: 'desc' }],
 *   filters: [{ field: 'status', operator: 'eq', value: 'active' }],
 *   search: 'john'
 * }
 * ```
 *
 * @public
 */
export interface QueryParams<T> extends PaginationParams {
  /** Sort parameters */
  sort?: SortParam<T>[]
  /** Filter parameters */
  filters?: FilterParam<T>[]
  /** Full-text search query */
  search?: string
  /** Fields to include in response */
  fields?: (keyof T)[]
  /** Relations to include */
  include?: string[]
}

/**
 * API endpoint definition
 *
 * @typeParam TRequest - Request body type
 * @typeParam TResponse - Response data type
 * @typeParam TParams - URL parameters type
 * @typeParam TQuery - Query parameters type
 *
 * @example
 * ```typescript
 * type GetUserEndpoint = ApiEndpoint<
 *   void,           // No request body
 *   User,           // Returns User
 *   { id: string }, // URL has id param
 *   void            // No query params
 * >
 * ```
 *
 * @public
 */
export interface ApiEndpoint<
  TRequest = void,
  TResponse = void,
  TParams = void,
  TQuery = void,
> {
  /** Request body type */
  request: TRequest
  /** Response data type */
  response: TResponse
  /** URL parameters type */
  params: TParams
  /** Query parameters type */
  query: TQuery
}

/**
 * REST resource endpoints
 *
 * @typeParam T - Resource type
 * @typeParam TCreate - Create input type
 * @typeParam TUpdate - Update input type
 *
 * @public
 */
export interface RestResource<T, TCreate = Omit<T, 'id'>, TUpdate = Partial<TCreate>> {
  /** List resources */
  list: ApiEndpoint<void, T[], void, QueryParams<T>>
  /** Get single resource */
  get: ApiEndpoint<void, T, { id: string }, void>
  /** Create resource */
  create: ApiEndpoint<TCreate, T, void, void>
  /** Update resource */
  update: ApiEndpoint<TUpdate, T, { id: string }, void>
  /** Delete resource */
  delete: ApiEndpoint<void, void, { id: string }, void>
}

/**
 * WebSocket message type
 *
 * @typeParam T - Message payload type
 *
 * @public
 */
export interface WebSocketMessage<T = unknown> {
  /** Message type/event name */
  type: string
  /** Message payload */
  payload: T
  /** Message ID for correlation */
  id?: string
  /** Timestamp */
  timestamp?: number
}

/**
 * Rate limit information
 *
 * @public
 */
export interface RateLimitInfo {
  /** Maximum requests allowed */
  limit: number
  /** Remaining requests */
  remaining: number
  /** Time until reset (seconds) */
  resetIn: number
  /** Reset timestamp */
  resetAt: Date
}

/**
 * Creates a success response
 *
 * @typeParam T - Data type
 * @param data - Response data
 * @param meta - Optional metadata
 * @returns Success response object
 *
 * @example
 * ```typescript
 * return createSuccessResponse(user, { requestId: 'abc123' })
 * ```
 *
 * @public
 */
export function createSuccessResponse<T>(data: T, meta?: ResponseMeta): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta,
  }
}

/**
 * Creates an error response
 *
 * @param code - Error code
 * @param message - Error message
 * @param status - HTTP status code
 * @param details - Optional error details
 * @returns Error response object
 *
 * @example
 * ```typescript
 * return createErrorResponse(
 *   'NOT_FOUND',
 *   'User not found',
 *   404
 * )
 * ```
 *
 * @public
 */
export function createErrorResponse(
  code: string,
  message: string,
  status?: HttpStatusCode,
  details?: ErrorDetail[]
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      status,
      details,
    },
  }
}

/**
 * Type guard for success responses
 *
 * @typeParam T - Data type
 * @param response - API response to check
 * @returns True if response is successful
 *
 * @example
 * ```typescript
 * const response = await api.getUser('123')
 * if (isSuccessResponse(response)) {
 *   console.log(response.data.name) // TypeScript knows data exists
 * }
 * ```
 *
 * @public
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true
}

/**
 * Type guard for error responses
 *
 * @typeParam T - Data type
 * @param response - API response to check
 * @returns True if response is an error
 *
 * @public
 */
export function isErrorResponse<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return response.success === false
}
