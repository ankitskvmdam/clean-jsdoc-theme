/**
 * User model module
 *
 * @remarks
 * This module contains user-related data models and types.
 *
 * @packageDocumentation
 */

/**
 * User role enumeration
 *
 * @remarks
 * Defines the different permission levels available in the system.
 *
 * @public
 */
export enum UserRole {
  /** Guest user with read-only access */
  Guest = 'guest',
  /** Regular user with basic permissions */
  User = 'user',
  /** Moderator with content management abilities */
  Moderator = 'moderator',
  /** Administrator with full system access */
  Admin = 'admin',
  /** Super administrator with unrestricted access */
  SuperAdmin = 'super_admin',
}

/**
 * User account status
 *
 * @public
 */
export enum AccountStatus {
  /** Account is active and functional */
  Active = 'active',
  /** Account is temporarily suspended */
  Suspended = 'suspended',
  /** Account is pending email verification */
  PendingVerification = 'pending_verification',
  /** Account has been deactivated by user */
  Deactivated = 'deactivated',
  /** Account has been permanently banned */
  Banned = 'banned',
}

/**
 * User contact information
 *
 * @public
 */
export interface ContactInfo {
  /** Primary email address */
  email: string
  /** Optional phone number */
  phone?: string
  /** Physical address */
  address?: {
    /** Street address line 1 */
    street: string
    /** Street address line 2 */
    street2?: string
    /** City name */
    city: string
    /** State or province */
    state: string
    /** Postal/ZIP code */
    postalCode: string
    /** Country code (ISO 3166-1 alpha-2) */
    country: string
  }
}

/**
 * User preferences configuration
 *
 * @public
 */
export interface UserPreferences {
  /**
   * UI theme preference
   * @defaultValue 'system'
   */
  theme: 'light' | 'dark' | 'system'

  /**
   * Preferred language code (ISO 639-1)
   * @defaultValue 'en'
   */
  language: string

  /**
   * Timezone identifier (IANA)
   * @defaultValue 'UTC'
   */
  timezone: string

  /**
   * Email notification settings
   */
  notifications: {
    /** Receive marketing emails */
    marketing: boolean
    /** Receive security alerts */
    security: boolean
    /** Receive product updates */
    updates: boolean
    /** Receive weekly digest */
    digest: boolean
  }
}

/**
 * Base user interface
 *
 * @remarks
 * Contains common properties shared by all user types.
 *
 * @public
 */
export interface IUser {
  /** Unique user identifier (UUID v4) */
  readonly id: string
  /** Username (unique, alphanumeric) */
  username: string
  /** Display name */
  displayName: string
  /** User's role in the system */
  role: UserRole
  /** Current account status */
  status: AccountStatus
  /** Contact information */
  contact: ContactInfo
  /** User preferences */
  preferences: UserPreferences
  /** Account creation timestamp */
  readonly createdAt: Date
  /** Last update timestamp */
  updatedAt: Date
  /** Last login timestamp */
  lastLoginAt?: Date
}

/**
 * User class representing a system user
 *
 * @remarks
 * This class provides a full implementation of the {@link IUser} interface
 * with additional utility methods for user management.
 *
 * @example
 * Creating a new user:
 * ```typescript
 * const user = new User({
 *   id: 'uuid-here',
 *   username: 'johndoe',
 *   displayName: 'John Doe',
 *   role: UserRole.User,
 *   status: AccountStatus.Active,
 *   contact: { email: 'john@example.com' },
 *   preferences: {
 *     theme: 'dark',
 *     language: 'en',
 *     timezone: 'America/New_York',
 *     notifications: { marketing: false, security: true, updates: true, digest: false }
 *   },
 *   createdAt: new Date(),
 *   updatedAt: new Date()
 * })
 * ```
 *
 * @public
 */
export class User implements IUser {
  /** @inheritDoc */
  public readonly id: string
  /** @inheritDoc */
  public username: string
  /** @inheritDoc */
  public displayName: string
  /** @inheritDoc */
  public role: UserRole
  /** @inheritDoc */
  public status: AccountStatus
  /** @inheritDoc */
  public contact: ContactInfo
  /** @inheritDoc */
  public preferences: UserPreferences
  /** @inheritDoc */
  public readonly createdAt: Date
  /** @inheritDoc */
  public updatedAt: Date
  /** @inheritDoc */
  public lastLoginAt?: Date

  /**
   * Creates a new User instance
   *
   * @param data - User data to initialize the instance
   */
  constructor(data: IUser) {
    this.id = data.id
    this.username = data.username
    this.displayName = data.displayName
    this.role = data.role
    this.status = data.status
    this.contact = data.contact
    this.preferences = data.preferences
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt
    this.lastLoginAt = data.lastLoginAt
  }

  /**
   * Checks if the user has admin privileges
   *
   * @returns True if user is Admin or SuperAdmin
   *
   * @example
   * ```typescript
   * if (user.isAdmin()) {
   *   // Show admin panel
   * }
   * ```
   */
  public isAdmin(): boolean {
    return this.role === UserRole.Admin || this.role === UserRole.SuperAdmin
  }

  /**
   * Checks if the user account is active
   *
   * @returns True if account status is Active
   */
  public isActive(): boolean {
    return this.status === AccountStatus.Active
  }

  /**
   * Updates user preferences
   *
   * @param updates - Partial preferences to update
   * @returns The updated user instance
   *
   * @example
   * ```typescript
   * user.updatePreferences({
   *   theme: 'dark',
   *   language: 'zh'
   * })
   * ```
   */
  public updatePreferences(updates: Partial<UserPreferences>): this {
    this.preferences = { ...this.preferences, ...updates }
    this.updatedAt = new Date()
    return this
  }

  /**
   * Records a login event
   *
   * @internal
   */
  public recordLogin(): void {
    this.lastLoginAt = new Date()
  }

  /**
   * Converts user to a JSON-serializable object
   *
   * @returns Plain object representation
   */
  public toJSON(): IUser {
    return {
      id: this.id,
      username: this.username,
      displayName: this.displayName,
      role: this.role,
      status: this.status,
      contact: this.contact,
      preferences: this.preferences,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
    }
  }

  /**
   * Creates a User instance from JSON data
   *
   * @param json - JSON string or parsed object
   * @returns New User instance
   * @throws {@link SyntaxError} If JSON string is invalid
   *
   * @example
   * ```typescript
   * const user = User.fromJSON('{"id":"...","username":"johndoe",...}')
   * ```
   */
  public static fromJSON(json: string | IUser): User {
    const data = typeof json === 'string' ? JSON.parse(json) : json
    return new User({
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      lastLoginAt: data.lastLoginAt ? new Date(data.lastLoginAt) : undefined,
    })
  }
}
