/**
 * @module UserService
 * @category Services
 */

import { User } from '../models/User.js';

/**
 * @typedef {Object} CreateUserPayload
 * @property {string} name
 */

/**
 * Callback for user creation
 * @callback CreateUserCallback
 * @param {User} user
 */

/**
 * Create a new user
 * @async
 * @function createUser
 * @param {CreateUserPayload} payload
 * @param {CreateUserCallback} [cb]
 * @returns {Promise<User>}
 * @fires UserService#userCreated
 * @see User
 */
export async function createUser(payload, cb) {
  const user = new User(Date.now().toString(), payload.name);

  if (cb) cb(user);

  return user;
}
