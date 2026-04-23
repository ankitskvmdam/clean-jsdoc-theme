/**
 * Represents a system user.
 * @class
 */
export class User {
  /**
   * Create a user.
   * @constructor
   * @param {string} id - Unique identifier
   * @param {string} name - Full name
   */
  constructor(id, name) {
    /** @private */
    this._id = id;

    /** @public */
    this.name = name;

    /** @readonly */
    this.createdAt = new Date();
  }

  /**
   * Get user ID
   * @returns {string}
   */
  getId() {
    return this._id;
  }

  /**
   * Update user name
   * @param {string} newName
   * @throws {Error} If name is empty
   * @example
   * user.updateName("John Doe");
   */
  updateName(newName) {
    if (!newName) throw new Error('Invalid name');
    this.name = newName;
  }
}
