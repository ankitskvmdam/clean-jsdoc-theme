import { submitForm } from './submit';

/** The CodePen `pen/define` prefill endpoint. */
const CODEPEN_DEFINE = 'https://codepen.io/pen/define';

/**
 * Build the CodePen `pen/define` form payload from the example code + site-wide
 * options. CodePen reads a single `data` field of JSON
 * (https://blog.codepen.io/documentation/prefill/): the example becomes `js`,
 * the options (e.g. `js_external`, `js_pre_processor`, `css`, `editors`,
 * `layout`) ride alongside. `js` is applied last so options can't clobber the
 * example code. Pure — no DOM — so it's unit-testable.
 */
export function buildCodepenForm(
  code: string,
  options: Record<string, unknown> = {}
): { action: string; fields: { data: string } } {
  const data = { title: 'Example', ...options, js: code };
  return { action: CODEPEN_DEFINE, fields: { data: JSON.stringify(data) } };
}

/** Open the example in a new CodePen tab (POST form). */
export function openCodepen(code: string, options: Record<string, unknown> = {}): void {
  const { action, fields } = buildCodepenForm(code, options);
  submitForm(action, fields);
}
