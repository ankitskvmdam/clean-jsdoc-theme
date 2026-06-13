/**
 * Run the jsdoc/typedoc pipeline in the theme's **extract mode** and read back
 * the slot template. aadesh spawns the real tool with
 * `CLEAN_JSDOC_THEME_EXTRACT=<tmp>` set; the theme writes
 * `{ version, slots }` there and exits before rendering (see the bridges'
 * extract mode). We then parse that file.
 *
 * The subprocess `runner` is injectable so the orchestration is unit-testable
 * without a real jsdoc/typedoc install.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExtractManifest } from '@clean-jsdoc-theme/utils';
import { EXTRACT_MANIFEST_VERSION } from '@clean-jsdoc-theme/utils';
import type { Pipeline } from './config';

/** The env var the theme's extract mode reads (see the bridges). */
export const EXTRACT_ENV_VAR = 'CLEAN_JSDOC_THEME_EXTRACT';

/** The env var the theme's build mode reads (path to a per-locale build spec). */
export const BUILD_ENV_VAR = 'CLEAN_JSDOC_THEME_BUILD';

/** A spawned pipeline run. `code` is the exit code; `stderr` is captured for errors. */
export interface RunResult {
  code: number;
  stderr: string;
}

/** Runs the pipeline binary. Injectable — the default uses `child_process.spawn`. */
export type PipelineRunner = (spec: {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}) => Promise<RunResult>;

/** Build the argv for a pipeline: `jsdoc -c <config>` or `typedoc --options <config>`. */
function pipelineArgv(pipeline: Pipeline, configPath: string): { command: string; args: string[] } {
  return pipeline === 'typedoc'
    ? { command: 'typedoc', args: ['--options', configPath] }
    : { command: 'jsdoc', args: ['-c', configPath] };
}

/**
 * Resolve a pipeline binary: prefer the project's local `node_modules/.bin/<name>`
 * (`.cmd` on Windows), else fall back to the bare name (resolved on PATH — the
 * normal case when aadesh runs as an installed bin). Returns an absolute path
 * when the local bin exists, so it works regardless of PATH.
 */
function resolveBin(cwd: string, name: string): string {
  const local = join(
    cwd,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? `${name}.cmd` : name
  );
  return existsSync(local) ? local : name;
}

/** Default runner: spawn the resolved binary via the shell, inheriting stdout. */
const defaultRunner: PipelineRunner = ({ command, args, cwd, env }) =>
  new Promise((resolvePromise, reject) => {
    // Build a single quoted command string and spawn with `shell: true` (so a
    // Windows `.cmd` bin runs). Passing the whole line as `command` with no
    // `args` array sidesteps Node's DEP0190 (args + shell) and lets us control
    // the quoting of the config path ourselves.
    const bin = resolveBin(cwd, command);
    const line = [bin, ...args].map((part) => `"${part}"`).join(' ');
    const child = spawn(line, { cwd, env, shell: true, stdio: ['ignore', 'inherit', 'pipe'] });
    let stderr = '';
    child.stderr?.on('data', (d) => {
      stderr += String(d);
    });
    child.on('error', reject);
    child.on('close', (code) => resolvePromise({ code: code ?? 1, stderr }));
  });

/**
 * Run the pipeline once with extra env vars (e.g. the extract/build signal),
 * resolving the binary and capturing the exit code. Shared by extract + build.
 */
export async function runPipeline(opts: {
  pipeline: Pipeline;
  configPath: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  runner?: PipelineRunner;
}): Promise<RunResult> {
  const runner = opts.runner ?? defaultRunner;
  const { command, args } = pipelineArgv(opts.pipeline, opts.configPath);
  return runner({ command, args, cwd: opts.cwd, env: opts.env });
}

export interface ExtractManifestOptions {
  configPath: string;
  cwd: string;
  pipeline: Pipeline;
  /** Injected for tests; defaults to spawning the real binary. */
  runner?: PipelineRunner;
}

/**
 * Run the pipeline in extract mode and return the parsed {@link ExtractManifest}.
 * Throws an actionable error when the pipeline fails or doesn't produce a valid
 * manifest (e.g. the configured theme isn't this one / is too old to support
 * extract mode).
 */
export async function extractManifest(opts: ExtractManifestOptions): Promise<ExtractManifest> {
  const dir = await mkdtemp(join(tmpdir(), 'cjt-extract-'));
  const out = join(dir, 'manifest.json');

  try {
    const result = await runPipeline({
      pipeline: opts.pipeline,
      configPath: opts.configPath,
      cwd: opts.cwd,
      env: { ...process.env, [EXTRACT_ENV_VAR]: out },
      runner: opts.runner,
    });

    if (result.code !== 0) {
      throw new Error(
        `aadesh: ${opts.pipeline} exited with code ${result.code} during extract.` +
          (result.stderr ? `\n${result.stderr.trim()}` : '')
      );
    }

    let parsed: ExtractManifest;
    try {
      parsed = JSON.parse(await readFile(out, 'utf8')) as ExtractManifest;
    } catch {
      throw new Error(
        `aadesh: ${opts.pipeline} did not produce a slot template. ` +
          'Is the configured theme clean-jsdoc-theme v5+ (extract-mode capable)?'
      );
    }
    if (typeof parsed.version !== 'number' || !Array.isArray(parsed.slots)) {
      throw new Error('aadesh: the extract manifest is malformed (expected { version, slots }).');
    }
    if (parsed.version !== EXTRACT_MANIFEST_VERSION) {
      throw new Error(
        `aadesh: extract manifest version ${parsed.version} != expected ${EXTRACT_MANIFEST_VERSION}.`
      );
    }
    return parsed;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
