// `lz-string` is a pure-CommonJS module: a *named* ESM import (`{ compressToBase64 }`)
// typechecks but throws at runtime when Node loads rang's ESM dist for SSR
// ("Named export not found"). The default-import interop reads the whole
// module.exports object, which works for both the SSR dynamic-import path and
// the esbuild island bundle.
import LZString from 'lz-string';
import { submitForm } from './submit';

/** The CodeSandbox `sandboxes/define` endpoint. */
const CODESANDBOX_DEFINE = 'https://codesandbox.io/api/v1/sandboxes/define';

/**
 * Build the CodeSandbox `define` `parameters` payload from the example code +
 * site-wide options. The define API
 * (https://codesandbox.io/docs/learn/sandboxes/cli-api#define-api) takes an
 * LZ-string-compressed-base64 JSON `{ files }` map; the example becomes
 * `index.js` and `options.dependencies` (if any) seed `package.json`. Pure (the
 * only "dep" is `lz-string`), so it's unit-testable without a DOM.
 */
export function buildCodesandboxParameters(
  code: string,
  options: Record<string, unknown> = {}
): string {
  const dependencies =
    options.dependencies && typeof options.dependencies === 'object'
      ? (options.dependencies as Record<string, string>)
      : {};
  const files = {
    'index.js': { content: code },
    'package.json': { content: JSON.stringify({ dependencies }) },
  };
  return LZString.compressToBase64(JSON.stringify({ files }));
}

/** Open the example in a new CodeSandbox tab (POST form). */
export function openCodesandbox(code: string, options: Record<string, unknown> = {}): void {
  submitForm(CODESANDBOX_DEFINE, { parameters: buildCodesandboxParameters(code, options) });
}
