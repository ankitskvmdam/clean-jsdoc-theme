/**
 * dwar.render result + options. Note: no `embedSearchIndex` — Pagefind runs in
 * a separate post-write step (`runPagefindAgainstDir`). See Q5.
 */

import type { SearchEntry } from './manifest';
import type { ThemeConfig } from './theme';

/** A single emitted file. `path` is forward-slash, relative to destination root. */
export interface OutputFile {
  path: string;
  contents: string | Uint8Array;
}

/** Aggregated result returned by `dwar.render`. Pure — no I/O is performed here. */
export interface RenderResult {
  files: OutputFile[];
  /** Entries that callers should hand to Pagefind after writing files. */
  search?: SearchEntry[];
  stats: {
    pageCount: number;
    assetCount: number;
    cssBytes: number;
    jsBytes: number;
    durationMs: number;
  };
}

/**
 * Options to `dwar.render`. There is intentionally no `embedSearchIndex` flag:
 * search index generation is a separate step (`runPagefindAgainstDir`) that
 * runs against the already-written output directory. See Q5.
 */
export interface RenderOptions {
  theme: ThemeConfig;
  /**
   * Destination directory. Used only for resolving paths inside output `OutputFile.path`
   * entries — dwar never writes files itself.
   */
  destination?: string;
}
