/**
 * A tiny documented class used to prove the plugin loads end-to-end.
 *
 * @example
 * const g = new Greeter('world');
 * g.greet();
 */
export class Greeter {
  /** Who to greet. */
  readonly who: string;

  /**
   * @param who - The name to greet.
   */
  constructor(who: string) {
    this.who = who;
  }

  /**
   * Returns a greeting.
   * @returns the greeting string
   */
  greet(): string {
    return `Hello, ${this.who}!`;
  }
}
