import { describe, expect, it, vi } from 'vitest';

interface PublicClientOptions {
  auth: { persistSession: boolean; autoRefreshToken: boolean; detectSessionInUrl: boolean };
  global: { fetch: typeof fetch };
}
const mocks = vi.hoisted(() => ({
  createClient: vi.fn((_url: string, _key: string, _options: PublicClientOptions) => ({})),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
import './publicRestaurantClient';

describe('public operating status connection', () => {
  it('never persists or refreshes customer authentication', () => {
    const options = mocks.createClient.mock.calls[0]?.[2];
    if (!options) throw new Error('Public client was not created');
    expect(options.auth).toEqual({
      persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
    });
  });

  it('bypasses cached store status responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]'));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const options = mocks.createClient.mock.calls[0]?.[2];
      if (!options) throw new Error('Public client was not created');
      await options.global.fetch('/restaurants_public', { method: 'GET' });
      expect(fetchMock).toHaveBeenCalledWith('/restaurants_public', { method: 'GET', cache: 'no-store' });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});