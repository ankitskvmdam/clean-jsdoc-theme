import { submitForm } from './submit';

/** The JSFiddle "pure" post endpoint. */
const JSFIDDLE_DEFINE = 'https://jsfiddle.net/api/post/library/pure/';

/** Coerce an option value to a string field (drop non-strings). */
function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Build the JSFiddle post payload from the example code + site-wide options.
 * JSFiddle takes discrete `js`/`html`/`css` fields plus `resources` (a
 * comma-separated list of external URLs), `wrap` (the load type — `b` = onLoad),
 * and `title`/`description`. All fields are strings. Pure — no DOM.
 */
export function buildJsfiddleForm(
  code: string,
  options: Record<string, unknown> = {}
): { action: string; fields: Record<string, string> } {
  return {
    action: JSFIDDLE_DEFINE,
    fields: {
      js: code,
      html: str(options.html),
      css: str(options.css),
      resources: str(options.resources),
      wrap: str(options.wrap) || 'b',
      title: str(options.title) || 'Example',
      description: str(options.description),
    },
  };
}

/** Open the example in a new JSFiddle tab (POST form). */
export function openJsfiddle(code: string, options: Record<string, unknown> = {}): void {
  const { action, fields } = buildJsfiddleForm(code, options);
  submitForm(action, fields);
}
