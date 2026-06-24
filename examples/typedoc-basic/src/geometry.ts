/**
 * Geometry primitives — a coordinate type, a directional enum, and a shape
 * interface, plus a couple of free functions.
 *
 * @module geometry
 */

/**
 * A point in 2-D space.
 *
 * @category Core
 */
export type Point = {
  /** The horizontal component. */
  x: number;
  /** The vertical component. */
  y: number;
};

/**
 * A callback invoked for every visited point.
 *
 * @category Core
 */
export type PointVisitor = (point: Point, index: number) => boolean;

/**
 * Cardinal travel directions.
 *
 * @category Core
 */
export enum Direction {
  /** Towards positive Y. */
  Up = 'up',
  /** Towards negative Y. */
  Down = 'down',
  /** Towards negative X. */
  Left = 'left',
  /** Towards positive X. */
  Right = 'right',
}

/**
 * Anything that occupies area in the plane.
 *
 * @category Shapes
 */
export interface Shape {
  /** Human-readable label for the shape. */
  readonly name: string;
  /** Compute the enclosed area. */
  area(): number;
}

/**
 * Compute the Euclidean distance between two points.
 *
 * @param a - the first point.
 * @param b - the second point.
 * @returns the straight-line distance.
 * @example
 * distance({ x: 0, y: 0 }, { x: 3, y: 4 }); // 5
 */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Move a point one unit in a {@link Direction}.
 *
 * @param point - the starting point.
 * @param direction - which way to step.
 * @returns a new, translated point.
 */
export function step(point: Point, direction: Direction): Point {
  switch (direction) {
    case Direction.Up:
      return { x: point.x, y: point.y + 1 };
    case Direction.Down:
      return { x: point.x, y: point.y - 1 };
    case Direction.Left:
      return { x: point.x - 1, y: point.y };
    case Direction.Right:
      return { x: point.x + 1, y: point.y };
  }
}

/**
 * Translate a point — by a `{ dx, dy }` delta, or by separate `dx`/`dy` numbers.
 *
 * @param point - the starting point.
 * @param delta - the offset to add to both axes.
 * @returns a new, translated point.
 */
export function translate(point: Point, delta: Point): Point;
/**
 * @param point - the starting point.
 * @param dx - the horizontal offset.
 * @param dy - the vertical offset.
 * @returns a new, translated point.
 */
export function translate(point: Point, dx: number, dy: number): Point;
export function translate(point: Point, deltaOrDx: Point | number, dy?: number): Point {
  if (typeof deltaOrDx === 'number') {
    return { x: point.x + deltaOrDx, y: point.y + (dy ?? 0) };
  }
  return { x: point.x + deltaOrDx.x, y: point.y + deltaOrDx.y };
}

/**
 * Interpolate between two points — a deliberately wide signature to exercise the
 * multi-line, tab-indented layout.
 *
 * @param from - the start point.
 * @param to - the end point.
 * @param t - progress in the range 0..1.
 * @param easing - optional easing function name.
 * @param clamp - whether to clamp `t` into 0..1.
 * @returns the interpolated point.
 */
export function interpolate(
  from: Point,
  to: Point,
  t: number,
  easing?: string,
  clamp?: boolean
): Point {
  const p = clamp ? Math.max(0, Math.min(1, t)) : t;
  return { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p };
}
