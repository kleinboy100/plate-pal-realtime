import { supabase } from '@/integrations/supabase/client';

// Loads the Google Maps JS API at runtime. The API key is fetched from the
// `get-maps-key` edge function so it never has to be embedded in the frontend
// .env (which breaks the Netlify build) and works on any domain.

let loadPromise: Promise<typeof google.maps> | null = null;

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window !== 'undefined' && (window as any).google?.maps?.importLibrary) {
    return (window as any).google.maps.importLibrary('maps').then(() => google.maps);
  }

  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const { data, error } = await supabase.functions.invoke('get-maps-key');
    if (error || !data?.key) {
      loadPromise = null;
      throw new Error('Could not load Google Maps key');
    }
    const key: string = data.key;

    // Official Google Maps inline bootstrap loader.
    ((g: any) => {
      let h: any, a: any, k: any, p = 'The Google Maps JavaScript API';
      const c = 'google';
      const l = 'importLibrary';
      const q = '__ib__';
      const m = document;
      let b: any = window as any;
      b = b[c] || (b[c] = {});
      const d = b.maps || (b.maps = {});
      const r = new Set();
      const e = new URLSearchParams();
      const u = () =>
        h ||
        (h = new Promise<void>(async (f, n) => {
          a = m.createElement('script');
          e.set('libraries', [...r] + '');
          for (k in g)
            e.set(
              k.replace(/[A-Z]/g, (t: string) => '_' + t[0].toLowerCase()),
              g[k]
            );
          e.set('callback', c + '.maps.' + q);
          a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
          d[q] = f;
          a.onerror = () => (h = n(Error(p + ' could not load.')));
          a.nonce = (m.querySelector('script[nonce]') as any)?.nonce || '';
          m.head.append(a);
        }));
      d[l]
        ? console.warn(p + ' only loads once. Ignoring:', g)
        : (d[l] = (f: any, ...n: any[]) => r.add(f) && u().then(() => d[l](f, ...n)));
    })({ key, v: 'weekly' });

    await google.maps.importLibrary('maps');
    await google.maps.importLibrary('places');
    return google.maps;
  })();

  return loadPromise;
}
