/**
 * `llmsTxt` option validation — the union parse, the defaults, and the one
 * warning that matters: enabled but no usable site URL, so the file can't be
 * generated. Resilient by design (a `warning`, never a throw); `strict`
 * escalates it like every other diagnostic.
 *
 * Pure + node-free.
 */
import { z } from 'zod';
import type { LlmsTxtConfig } from '../site/llms';
import type { DiagnosticBag } from './diagnostics';

/** `llmsTxt` object form — both fields optional, defaulted by the validator. */
export const LlmsTxtConfigSchema = z.object({
  full: z.boolean().optional(),
  api: z.union([z.boolean(), z.literal('index')]).optional(),
});

/** `llmsTxt` is a boolean shorthand OR a config object. */
export const LlmsTxtSchema = z.union([z.boolean(), LlmsTxtConfigSchema]);

/**
 * Resolve the `llmsTxt` opt. Returns `undefined` (feature off) when unset,
 * `false`, or malformed — and when `siteUrl` isn't usable, which warns, because
 * the author asked for a file they would otherwise never receive.
 */
export function validateLlmsTxt(
  raw: unknown,
  siteUrl: string | undefined,
  bag: DiagnosticBag
): LlmsTxtConfig | undefined {
  if (raw === undefined || raw === null) return undefined;

  const parsed = LlmsTxtSchema.safeParse(raw);
  if (!parsed.success) {
    bag.warning('llms-txt/invalid', 'llmsTxt must be `true`/`false` or `{ full?, api? }`.', {
      hint: "`full` is a boolean; `api` accepts `true`, `false`, or `'index'`.",
      path: 'llmsTxt',
    });
    return undefined;
  }

  if (parsed.data === false) return undefined;
  const cfg = parsed.data === true ? {} : parsed.data;

  if (!siteUrl) {
    bag.warning(
      'llms-txt/no-site-url',
      'llmsTxt is enabled but no usable site URL is configured — llms.txt will NOT be generated.',
      {
        hint: 'set `siteUrl` to the published docs URL (e.g. `https://example.com/docs`); llms.txt needs absolute links.',
        path: 'llmsTxt',
      }
    );
    return undefined;
  }

  return { full: cfg.full ?? true, api: cfg.api ?? true };
}
