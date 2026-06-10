import { describe, it, expect, vi } from 'vitest';
import {
  createGoogleFontResolver,
  type FetchLike,
  type FontExistence,
} from '../../config/google-fonts';

/** A fetch stub that records the URLs it was called with and returns a status. */
function fetchReturning(status: number): { fetch: FetchLike; calls: string[] } {
  const calls: string[] = [];
  const fetch: FetchLike = async (url) => {
    calls.push(url);
    return { status };
  };
  return { fetch, calls };
}

describe('createGoogleFontResolver', () => {
  it('maps 200 → exists, 400 → missing, other status → unknown', async () => {
    const exists = createGoogleFontResolver({ fetch: fetchReturning(200).fetch });
    const missing = createGoogleFontResolver({ fetch: fetchReturning(400).fetch });
    const teapot = createGoogleFontResolver({ fetch: fetchReturning(418).fetch });

    expect(await exists('Roboto')).toBe<FontExistence>('exists');
    expect(await missing('NotARealFontXyz123')).toBe<FontExistence>('missing');
    expect(await teapot('Roboto')).toBe<FontExistence>('unknown');
  });

  it('fails open (unknown) when fetch throws', async () => {
    const fetch: FetchLike = async () => {
      throw new Error('network down');
    };
    const resolve = createGoogleFontResolver({ fetch });
    expect(await resolve('Roboto')).toBe('unknown');
  });

  it('fails open (unknown) on timeout / abort', async () => {
    // A fetch that rejects when its signal aborts — mirrors real fetch behavior.
    const fetch: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    const resolve = createGoogleFontResolver({ fetch, timeoutMs: 5 });
    expect(await resolve('Roboto')).toBe('unknown');
  });

  it('encodes spaces as + in the request URL', async () => {
    const { fetch, calls } = fetchReturning(200);
    const resolve = createGoogleFontResolver({ fetch });
    await resolve('Spline Sans');
    expect(calls[0]).toBe('https://fonts.googleapis.com/css?family=Spline+Sans');
  });

  it('caches one fetch per family across repeat calls', async () => {
    const fetch = vi.fn<FetchLike>(async () => ({ status: 200 }));
    const resolve = createGoogleFontResolver({ fetch });

    await resolve('Roboto');
    await resolve('Roboto');
    await resolve('Inter');

    expect(fetch).toHaveBeenCalledTimes(2); // Roboto once, Inter once
  });

  it('returns unknown for an empty family without fetching', async () => {
    const fetch = vi.fn<FetchLike>(async () => ({ status: 200 }));
    const resolve = createGoogleFontResolver({ fetch });
    expect(await resolve('   ')).toBe('unknown');
    expect(fetch).not.toHaveBeenCalled();
  });
});
