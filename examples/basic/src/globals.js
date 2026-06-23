/**
 * Resolve the effective runtime configuration for the app.
 *
 * Defaults are `host: "localhost"` and `port: 3000`. Pass an `overrides` object
 * to shallow-merge on top — for example `{ port: 8080 }` changes just the port
 * and leaves the rest at their defaults.
 *
 * @function getConfig
 * @global
 * @param {Object} [overrides] - Partial config to merge over the defaults.
 * @param {string} [overrides.host] - Hostname to bind to.
 * @param {number} [overrides.port] - Port to listen on.
 * @returns {Object} The resolved configuration.
 *
 * @example
 * const cfg = getConfig({ port: 8080 });
 * // => { host: 'localhost', port: 8080 }
 */
function getConfig(overrides) {
  return Object.assign({ host: 'localhost', port: 3000 }, overrides);
}

/**
 * Format a byte count as a human-readable size (e.g. `1.5 kB`).
 *
 * @function humanSize
 * @global
 * @param {number} bytes - The byte count.
 * @returns {string} The formatted size.
 */
function humanSize(bytes) {
  if (bytes < 1000) return `${bytes} B`;
  return `${(bytes / 1000).toFixed(1)} kB`;
}
