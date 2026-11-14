/**
 * Performance assertion for the scanner/stripper tests: checks that a function
 * SCALES linearly, instead of bounding its wall-clock time (#355).
 *
 * Those tests exist to catch quadratic or catastrophic blow-ups (a backtracking
 * regex, a rescan per opener). An absolute bound such as "1MB in under a
 * second" holds on a developer machine but not on a small shared CI runner
 * that runs every package's suite at once, where the same linear code takes
 * 10-25 times longer. A ratio between two input sizes cancels out the machine:
 *
 *   1. Calibrate: starting at `startSize`, build the input, warm up once, and
 *      double the size until the fastest of three runs takes `floorMs` (below
 *      that, timer granularity and noise swamp the ratio) or `maxSize` is hit.
 *   2. Measure: time that size N and `factor` times N, interleaved (so load
 *      from other workers lands on both alike), keeping the fastest of `runs`
 *      runs per size; the fastest run is the one least disturbed by GC and
 *      other processes.
 *   3. Assert `t(factor * N) / t(N) < maxRatio`. When t(N) stays under
 *      `floorMs` even at `maxSize`, `floorMs` stands in for it, so noise in a
 *      tiny time cannot fail the test (a quadratic function is not that fast
 *      at that size).
 *
 * Why 8x and 24 rather than 4x and 8: linear code is not exactly linear once
 * its input outgrows the CPU caches. The search-text strip in dwar measured
 * t(4N) / t(N) of 8.4-10.1 for N = 1MB on an idle machine, so a limit of 8
 * would be flaky. The cache step costs a roughly fixed factor (up to about
 * 2.5x), so a larger size step separates the two cases better: at 8x, linear
 * code gives 8 (about 20 at worst) and quadratic code about 64; 24 sits between.
 * A V8 regex cliff is a different matter: it can add about 4x on its own, so a
 * case whose input crosses one keeps its window below it with `maxSize` (see
 * the stray-< case in dwar's html.test.ts).
 *
 * A near miss is retried (`attempts`) to absorb a one-off stall; a ratio of
 * twice the limit or more fails at once, since no stall explains it.
 *
 * Pair it with a generous vitest timeout (`PERF_TEST_TIMEOUT`) as a hang guard:
 * a catastrophic regression must still fail fast rather than run for minutes.
 *
 * TEST-ONLY, and one of three identical copies:
 *   packages/utils/src/__tests__/linear-scaling.ts
 *   packages/dwar/src/__tests__/linear-scaling.ts
 *   packages/setu/src/__tests__/linear-scaling.ts
 * Each package's tsconfig sets `rootDir` inside the package, so one shared file
 * outside them would not typecheck without changing the build config, and the
 * packages' entry points never import from __tests__, so no copy ships. Change
 * all three together.
 */
import { expect } from 'vitest';

/** Vitest timeout for a scaling test: only a hang guard, never the assertion. */
export const PERF_TEST_TIMEOUT = 60_000;

export interface LinearScalingOptions {
  /** First size `makeInput` gets (the unit is the caller's). Default 4096. */
  startSize?: number;
  /**
   * Largest N calibration may reach; the big input is `factor` times it. Default
   * 524288, so a default input stays within 4M characters: the old wall-clock
   * tests used 1MB, and some regexes overflow the stack on much longer inputs.
   */
  maxSize?: number;
  /** How many times bigger the second input is. Default 8. */
  factor?: number;
  /** The ratio t(factor * N) / t(N) must stay below this. Default 24. */
  maxRatio?: number;
  /** Time t(N) should reach for the ratio to mean something. Default 10 ms. */
  floorMs?: number;
  /** Timed runs per size; the fastest counts. Default 5. */
  runs?: number;
  /** Measurements to try on a near miss before failing. Default 3. */
  attempts?: number;
}

export interface ScalingMeasurement {
  /** N, the size after calibration. */
  size: number;
  /** Fastest run at N, in ms. */
  smallMs: number;
  /** Fastest run at `factor` * N, in ms. */
  largeMs: number;
  /** largeMs / max(smallMs, floorMs). */
  ratio: number;
}

// Results go here so no call can be optimized away as unused.
let sink: unknown;

function timeOnce<T>(fn: (input: T) => unknown, input: T): number {
  const t = performance.now();
  sink = fn(input);
  return performance.now() - t;
}

function fastest<T>(fn: (input: T) => unknown, input: T, runs: number): number {
  let best = Infinity;
  for (let i = 0; i < runs; i++) best = Math.min(best, timeOnce(fn, input));
  return best;
}

/**
 * Measures how `fn` scales from `makeInput(N)` to `makeInput(factor * N)`, with
 * N calibrated as described above. Exported for diagnostics; tests should call
 * {@link expectLinearScaling}.
 */
export function measureScaling<T>(
  fn: (input: T) => unknown,
  makeInput: (size: number) => T,
  options: LinearScalingOptions = {}
): ScalingMeasurement {
  const { startSize = 4_096, maxSize = 524_288, factor = 8, floorMs = 10, runs = 5 } = options;

  let size = startSize;
  let small = makeInput(size);
  fn(small); // warm-up: JIT, plus flattening the input string
  while (fastest(fn, small, 3) < floorMs && size * 2 <= maxSize) {
    size *= 2;
    small = makeInput(size);
    fn(small);
  }

  const large = makeInput(size * factor);
  fn(large);
  let smallMs = Infinity;
  let largeMs = Infinity;
  for (let i = 0; i < runs; i++) {
    smallMs = Math.min(smallMs, timeOnce(fn, small));
    largeMs = Math.min(largeMs, timeOnce(fn, large));
  }
  void sink;
  return { size, smallMs, largeMs, ratio: largeMs / Math.max(smallMs, floorMs) };
}

/**
 * Asserts that `fn` scales linearly: t(factor * N) / t(N) < maxRatio, with a
 * near miss retried up to `attempts` times. Returns the measurement.
 */
export function expectLinearScaling<T>(
  fn: (input: T) => unknown,
  makeInput: (size: number) => T,
  options: LinearScalingOptions = {}
): ScalingMeasurement {
  const { factor = 8, maxRatio = 24, attempts = 3 } = options;
  let m = measureScaling(fn, makeInput, options);
  for (let i = 1; i < attempts && m.ratio >= maxRatio && m.ratio < 2 * maxRatio; i++) {
    m = measureScaling(fn, makeInput, options);
  }
  const exponent = Math.log(m.ratio) / Math.log(factor);
  expect(
    m.ratio,
    `t(${factor}N) / t(N) with N = ${m.size}: ${m.largeMs.toFixed(1)} ms / ` +
      `${m.smallMs.toFixed(1)} ms, about N^${exponent.toFixed(2)} ` +
      `(linear gives about ${factor}, quadratic about ${factor * factor})`
  ).toBeLessThan(maxRatio);
  return m;
}
