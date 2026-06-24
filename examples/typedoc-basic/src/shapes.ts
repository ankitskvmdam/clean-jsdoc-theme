/**
 * Concrete shapes plus a small namespace of factory helpers.
 *
 * @module shapes
 */

import type { Point, Shape } from './geometry';

/**
 * A circle defined by a centre point and a radius.
 *
 * @category Shapes
 * @example
 * const c = new Circle({ x: 0, y: 0 }, 2);
 * c.area(); // ~12.566
 */
export class Circle implements Shape {
  /** Display name. */
  readonly name = 'circle';

  /**
   * Build a circle.
   *
   * @param center - the centre point.
   * @param radius - the radius, in units.
   */
  constructor(
    /** The centre of the circle. */
    public readonly center: Point,
    /** The radius of the circle. */
    public radius: number
  ) {}

  /** The diameter — twice the radius. */
  get diameter(): number {
    return this.radius * 2;
  }

  /**
   * Compute the area (π r²).
   *
   * @returns the enclosed area.
   */
  area(): number {
    return Math.PI * this.radius * this.radius;
  }

  /**
   * Create a unit circle at the origin.
   *
   * @returns a radius-1 circle centred on `(0, 0)`.
   */
  static unit(): Circle {
    return new Circle({ x: 0, y: 0 }, 1);
  }

  /**
   * Scale the circle — by a numeric factor, or to an explicit radius.
   *
   * @param factor - the multiplier to apply to the current radius.
   * @returns a new, scaled circle.
   */
  scale(factor: number): Circle;
  /**
   * @param options - an explicit target radius.
   * @returns a new circle at the given radius.
   */
  scale(options: { radius: number }): Circle;
  scale(arg: number | { radius: number }): Circle {
    const radius = typeof arg === 'number' ? this.radius * arg : arg.radius;
    return new Circle(this.center, radius);
  }
}

/**
 * Factory helpers for building shapes.
 *
 * @namespace
 */
export namespace Factory {
  /** The default radius used by {@link Factory.smallCircle}. */
  export const SMALL_RADIUS = 0.5;

  /**
   * Build a small circle at the origin.
   *
   * @returns a circle with radius {@link Factory.SMALL_RADIUS}.
   */
  export function smallCircle(): Circle {
    return new Circle({ x: 0, y: 0 }, SMALL_RADIUS);
  }
}
