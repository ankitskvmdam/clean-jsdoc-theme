import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGoogleFontResolver } from '@clean-jsdoc-theme/utils';

// `node:https` is mocked: the tests pin the request shape and the error
// semantics without touching the network.
const get = vi.hoisted(() => vi.fn());
vi.mock('node:https', () => ({ get }));

import { httpsFetch } from '../https-fetch';

interface FakeRequest extends EventEmitter {
  options: { agent?: unknown; headers?: Record<string, string>; signal?: AbortSignal };
}

/** Wire `get` so each call returns a fake request; `respond` decides what happens. */
function mockGet(respond: (req: FakeRequest, onResponse: (res: unknown) => void) => void): void {
  get.mockImplementation((_url: string, options: FakeRequest['options'], onResponse) => {
    const req = Object.assign(new EventEmitter(), { options }) as FakeRequest;
    queueMicrotask(() => respond(req, onResponse));
    return req;
  });
}

/** Behave like `https.get` with a `signal`: abort emits an `error` on the request. */
function honourAbort(req: FakeRequest): void {
  req.options.signal?.addEventListener('abort', () => req.emit('error', new Error('aborted')));
}

beforeEach(() => {
  get.mockReset();
});

describe('httpsFetch', () => {
  it('resolves with the status, drops the body, and keeps no socket alive', async () => {
    const destroy = vi.fn();
    mockGet((_req, onResponse) => onResponse({ statusCode: 400, destroy }));
    const controller = new AbortController();

    const res = await httpsFetch('https://fonts.example/css?family=X', {
      headers: { 'User-Agent': 'ua' },
      signal: controller.signal,
    });

    expect(res).toEqual({ status: 400 });
    expect(destroy).toHaveBeenCalledOnce();
    const [url, options] = get.mock.calls[0]!;
    expect(url).toBe('https://fonts.example/css?family=X');
    expect(options).toEqual({
      agent: false,
      headers: { 'User-Agent': 'ua' },
      signal: controller.signal,
    });
  });

  it('rejects on a request error', async () => {
    mockGet((req) => req.emit('error', new Error('ENOTFOUND')));
    await expect(httpsFetch('https://fonts.example/css')).rejects.toThrow('ENOTFOUND');
  });

  it('keeps the resolver fail-open: a timeout and an error both read as unknown', async () => {
    mockGet(honourAbort); // never answers; only the resolver's timeout ends it
    const slow = createGoogleFontResolver({ fetch: httpsFetch, timeoutMs: 5 });
    expect(await slow('Roboto')).toBe('unknown');

    mockGet((req) => req.emit('error', new Error('ECONNRESET')));
    const offline = createGoogleFontResolver({ fetch: httpsFetch });
    expect(await offline('Roboto')).toBe('unknown');
  });

  it('maps 200 / 400 through the resolver to exists / missing', async () => {
    mockGet((_req, onResponse) => onResponse({ statusCode: 200, destroy: () => {} }));
    expect(await createGoogleFontResolver({ fetch: httpsFetch })('Roboto')).toBe('exists');
    mockGet((_req, onResponse) => onResponse({ statusCode: 400, destroy: () => {} }));
    expect(await createGoogleFontResolver({ fetch: httpsFetch })('Nope')).toBe('missing');
  });
});
