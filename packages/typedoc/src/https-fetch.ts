/**
 * A `node:https` implementation of utils' `FetchLike`, injected into
 * `createGoogleFontResolver` instead of the global (undici) `fetch`.
 *
 * Why: on Windows, `process.exit` shortly after an undici `fetch()` aborts Node
 * with a libuv assertion (`!(handle->flags & UV_HANDLE_CLOSING)`, exit 127).
 * A strict build that fails validation right after the Google Fonts check
 * exits exactly then, so the failure surfaced as a native crash instead of
 * exit 1. A plain `node:https` request has no such handle and exits cleanly.
 *
 * Only the status code is read; the response body is discarded and the
 * socket destroyed (`res.destroy()`), so nothing lingers after the check.
 * Abort (the resolver's timeout) and network errors reject, which the
 * resolver maps to `'unknown'` (fail-open, an info note) exactly as before.
 * Redirects are not followed: a 3xx resolves the check to `'unknown'`.
 *
 * The request goes through Node's default agent (`https.globalAgent`), so it
 * honours the env proxy (`NODE_USE_ENV_PROXY=1` / `--use-env-proxy` with
 * `HTTPS_PROXY`/`NO_PROXY`, Node >= 24) just like the global `fetch`. Don't
 * pass `agent: false`: that builds a fresh Agent without the proxy settings.
 *
 * utils stays browser-safe because the `node:` import lives here, in the
 * Node-only bridge. The JSDoc bridge carries a copy
 * (`packages/clean-jsdoc-theme/src/https-fetch.ts`); keep the two in sync.
 */
import { get } from 'node:https';
import type { FetchLike } from '@clean-jsdoc-theme/utils';

export const httpsFetch: FetchLike = (url, init) =>
  new Promise((resolve, reject) => {
    const req = get(
      url,
      {
        ...(init?.headers ? { headers: init.headers } : {}),
        ...(init?.signal ? { signal: init.signal } : {}),
      },
      (res) => {
        const status = res.statusCode ?? 0;
        // Status is all the resolver needs; drop the body and the socket.
        res.destroy();
        resolve({ status });
      }
    );
    req.on('error', reject);
  });
