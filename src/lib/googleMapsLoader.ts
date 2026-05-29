import { supabase } from '@/integrations/supabase/client';

// Loads the Google Maps JavaScript API (with the Places library) exactly once,
// fetching the browser API key from the `get-maps-key` edge function so the
// same referrer-restricted key works on every domain (Lovable, published, and
// the custom Netlify domain).
//
// Uses Google's official inline bootstrap loader, which installs
// `google.maps.importLibrary` synchronously and lets us await each library.

let loaderPromise: Promise<typeof google> | null = null;

async function fetchApiKey(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('get-maps-key');
  if (error || !data?.key) {
    throw new Error('Could not load Google Maps key');
  }
  return data.key as string;
}

function installBootstrap(key: string) {
  // Official Google Maps JS API inline bootstrap loader.
  // Defines window.google.maps.importLibrary immediately.
  /* eslint-disable */
  (g => {
    var h: any, a: any, k: any, p = "The Google Maps JavaScript API",
      c = "google", l = "importLibrary", q = "__ib__",
      m = document, b: any = window;
    b = b[c] || (b[c] = {});
    var d = b.maps || (b.maps = {}), r = new Set(), e = new URLSearchParams(),
      u = () => h || (h = new Promise(async (f, n) => {
        a = m.createElement("script");
        e.set("libraries", [...r] + "");
        for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]);
        e.set("callback", c + ".maps." + q);
        a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
        d[q] = f;
        a.onerror = () => h = n(Error(p + " could not load."));
        a.nonce = (m.querySelector("script[nonce]") as any)?.nonce || "";
        m.head.append(a);
      }));
    d[l] ? console.warn(p + " only loads once. Ignoring:", g) :
      d[l] = (f: any, ...n: any) => r.add(f) && u().then(() => d[l](f, ...n));
  })({ key, v: "weekly" });
  /* eslint-enable */
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (loaderPromise) return loaderPromise;

  loaderPromise = (async () => {
    // Already fully loaded.
    if (typeof window !== 'undefined' && (window as any).google?.maps?.importLibrary) {
      await (window as any).google.maps.importLibrary('maps');
      return (window as any).google;
    }

    const key = await fetchApiKey();
    installBootstrap(key);

    // Initialise the libraries we use.
    await (window as any).google.maps.importLibrary('maps');
    await (window as any).google.maps.importLibrary('places');
    await (window as any).google.maps.importLibrary('marker');
    await (window as any).google.maps.importLibrary('geometry');

    return (window as any).google;
  })();

  return loaderPromise;
}
