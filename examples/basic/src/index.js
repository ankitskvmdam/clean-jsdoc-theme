/**
 * Entry point
 * @exports App
 */

import { createUser } from './services/UserService.js';

/**
 * Initialize app
 * See {@link createUser}
 *
 * Example:
 * {@code
 * createUser({ name: "Ank" });
 * }
 *
 * {@tutorial getting-started}
 */
export function init() {
  console.log('App initialized');
}
