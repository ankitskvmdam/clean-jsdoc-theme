/**
 * A shape used across the fixtures.
 * @group Models
 */
export interface Point {
  /** X coordinate. */
  x: number;
  /** Y coordinate. */
  y: number;
}

/**
 * Base entity.
 * @group Models
 */
export abstract class Base<T> {
  /** Primary identifier. */
  readonly id: string;
  constructor(id: string) {
    this.id = id;
  }
  /** Serialize to a plain object. */
  toJSON(): { id: string } {
    return { id: this.id };
  }
  /** Abstract hook subclasses override. */
  abstract describe(): string;
}

/** Something that can be named. @group Contracts */
export interface Named {
  /** Human-readable name. */
  readonly name: string;
}

/**
 * A widget. Extends {@link Base} and implements {@link Named}.
 * @group Widgets
 */
export class Widget extends Base<number> implements Named {
  readonly name: string;
  constructor(id: string, name: string) {
    super(id);
    this.name = name;
  }
  /** Overrides {@link Base.describe}. */
  describe(): string {
    return this.name;
  }
  /** A getter accessor. */
  get label(): string {
    return `${this.name}#${this.id}`;
  }
  /**
   * {@inheritDoc Base.toJSON}
   */
  override toJSON(): { id: string } {
    return super.toJSON();
  }
  /** Load this widget's data asynchronously. */
  async load(): Promise<void> {
    await Promise.resolve();
  }
}

/**
 * Parse a value. Overloaded.
 * @group Functions
 */
export function parse(input: string): number;
export function parse(input: number): string;
export function parse(input: string | number): number | string {
  return typeof input === "string" ? Number(input) : String(input);
}

/**
 * Options object passed to {@link configure}. Inline object type — exercises
 * structured-type expansion.
 * @group Functions
 */
export function configure(opts: { retries: number; label?: string; point: Point }): void {
  void opts;
}

/** A config union type alias. @group Models */
export type Mode = "fast" | "safe" | "debug";

/** A public constant. @group Functions */
export const VERSION: string = "1.0.0";
