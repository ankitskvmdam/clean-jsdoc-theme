import { makeStringSafeForOSFilename } from './helper';

/**
 * To create a name registry.
 */
export class NameRegistry {
  private _registry = new Map<string, string>();

  /**
   * If `str` is not present in the registry, returns it as-is. Otherwise
   * appends `_1`, `_2`, ... until it finds a key not present in the registry.
   */
  makeUnique(str: string) {
    let candidate = str;
    let i = 1;
    while (this._registry.has(candidate)) {
      candidate = `${str}_${i++}`;
    }
    return candidate;
  }
  /**
   * Returns a unique flat filename for the given path.
   */
  makeUniqueName(name: string) {
    const unique = this.makeUnique(makeStringSafeForOSFilename(name));
    this._registry.set(unique, name);
    return unique;
  }

  /**
   * Returns the underlying registry as a read-only map of `unique → original input`.
   */
  getRegistry(): ReadonlyMap<string, string> {
    return this._registry;
  }
}
