import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync('public/sw.js', 'utf8');

function worker() {
  const handlers = new Map<string, (event: Record<string, unknown>) => void>();
  const cache = { addAll: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) };
  const caches = {
    open: vi.fn().mockResolvedValue(cache), keys: vi.fn().mockResolvedValue(['zoot-static-v6', 'other-app-cache']),
    delete: vi.fn().mockResolvedValue(true), match: vi.fn().mockResolvedValue({ offline: true }),
  };
  const client = { url: 'https://xoot.test/app/book', navigate: vi.fn() };
  const self = { location: { origin: 'https://xoot.test' }, addEventListener: (name: string, handler: (event: Record<string, unknown>) => void) => handlers.set(name, handler),
    skipWaiting: vi.fn(), clients: { claim: vi.fn().mockResolvedValue(undefined), matchAll: vi.fn().mockResolvedValue([client]) } };
  const fetch = vi.fn();
  runInNewContext(source, { self, caches, fetch, URL });
  return { handlers, caches, cache, self, client, fetch };
}

describe('service worker preserves real sessions and offline branding', () => {
  it('caches the original fonts with the offline screen', async () => {
    const w = worker();
    let task: Promise<unknown> | undefined;
    w.handlers.get('install')!({ waitUntil: (promise: Promise<unknown>) => { task = promise; } });
    await task;
    expect(w.cache.addAll).toHaveBeenCalledWith(expect.arrayContaining([
      '/offline.html', '/fonts/caveat-latin-var.woff2', '/fonts/plus-jakarta-sans-latin-var.woff2', '/fonts/newsreader-latin-var.woff2',
    ]));
  });

  it('activates without navigating away from an unfinished booking and leaves unrelated caches alone', async () => {
    const w = worker();
    let task: Promise<unknown> | undefined;
    w.handlers.get('activate')!({ waitUntil: (promise: Promise<unknown>) => { task = promise; } });
    await task;
    expect(w.self.clients.claim).toHaveBeenCalledOnce();
    expect(w.client.navigate).not.toHaveBeenCalled();
    expect(w.caches.delete.mock.calls).toEqual([['zoot-static-v6']]);
  });

  it('does not replace a cached asset with an HTTP error response', async () => {
    const w = worker();
    const response = { ok: false, status: 503, clone: vi.fn() };
    w.fetch.mockResolvedValue(response);
    let task: Promise<unknown> | undefined;
    w.handlers.get('fetch')!({ request: { method: 'GET', mode: 'cors', url: 'https://xoot.test/assets/app.js' },
      respondWith: (promise: Promise<unknown>) => { task = promise; }, waitUntil: vi.fn() });
    expect(await task).toBe(response);
    expect(w.cache.put).not.toHaveBeenCalled();
  });

  it('uses the offline page for failed navigation without caching private page contents', async () => {
    const w = worker();
    w.fetch.mockRejectedValue(new Error('offline'));
    let task: Promise<unknown> | undefined;
    w.handlers.get('fetch')!({ request: { method: 'GET', mode: 'navigate', url: 'https://xoot.test/app/book' },
      respondWith: (promise: Promise<unknown>) => { task = promise; } });
    expect(await task).toEqual({ offline: true });
    expect(w.caches.match).toHaveBeenCalledWith('/offline.html');
    expect(w.cache.put).not.toHaveBeenCalled();
  });
});
