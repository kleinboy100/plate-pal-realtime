// Loads the Google Maps JavaScript API (with Places, Marker, Geometry) once.
//
// The key below is the Google Maps **browser** key. It is referrer-restricted
// in Google Cloud Console, so it is SAFE to ship in client code — Google blocks
// any domain that is not on the allowlist. This is a publishable key, not a
// hidden secret, so it lives in the frontend (no edge function / secret needed,
// which also avoids the "secret exposed" deploy scanner false-positive).
//
// To allow a new domain (e.g. www.nosty.co.za), add it to this key's HTTP
// referrer restrictions in Google Cloud Console — do NOT change this file.

// Your own production key — referrer-restricted to nosty.life / nosty.co.za,
// with billing enabled. Used on the live custom domains.
const CUSTOM_BROWSER_KEY = 'AIzaSyAZLLgYkblCL3mambA14hl52DWayMBR18A';

// Lovable-managed key (from the Google Maps connector). It is referrer-locked to
// *.lovable.app / *.lovableproject.com, so it is the one that works in preview.
const MANAGED_BROWSER_KEY =
  (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined) || '';

// Pick the right key for the current host: managed key on Lovable preview
// domains, your own key everywhere else (production custom domains).
function resolveBrowserKey(): string {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLovableHost = /\.lovable\.app$|\.lovableproject\.com$/.test(host);
  if (isLovableHost && MANAGED_BROWSER_KEY) return MANAGED_BROWSER_KEY;
  return CUSTOM_BROWSER_KEY;
}

let loaderPromise: Promise<typeof google> | null = null;

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

// Holds a human-readable Google Maps auth error (set by gm_authFailure), so we
// can show it on screen — handy on mobile where there's no dev console.
let authError: string | null = null;

export function getMapsAuthError(): string | null {
  return authError;
}

function installAuthFailureHandler() {
  if (typeof window === 'undefined') return;
  // Google calls this global when the API key is rejected (wrong domain,
  // billing off, or API not enabled). Capture it so the UI can display it.
  (window as any).gm_authFailure = () => {
    const host = window.location.hostname;
    authError =
      `Google Maps rejected the key for "${host}". ` +
      `Fix in Google Cloud Console: (1) enable billing, ` +
      `(2) enable "Maps JavaScript API" and "Places API (New)", ` +
      `(3) add https://${host}/* and https://*.${host.replace(/^www\./, '')}/* ` +
      `to the key's HTTP referrer allowlist.`;
  };
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (loaderPromise) return loaderPromise;

  loaderPromise = (async () => {
    installAuthFailureHandler();

    // Already fully loaded.
    if (typeof window !== 'undefined' && (window as any).google?.maps?.importLibrary) {
      await (window as any).google.maps.importLibrary('maps');
      return (window as any).google;
    }

    installBootstrap(resolveBrowserKey());

    // Race the library load against a timeout. If the key is rejected, Google
    // never resolves importLibrary, so we surface the captured auth error.
    const load = (async () => {
      await (window as any).google.maps.importLibrary('maps');
      await (window as any).google.maps.importLibrary('places');
      await (window as any).google.maps.importLibrary('marker');
      await (window as any).google.maps.importLibrary('geometry');
      return (window as any).google;
    })();

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        if (authError) reject(new Error(authError));
        else reject(new Error('Google Maps took too long to load.'));
      }, 8000);
    });

    return (await Promise.race([load, timeout])) as typeof google;
  })();

  // If loading fails, allow a future retry instead of caching the failure.
  loaderPromise.catch(() => {
    loaderPromise = null;
  });

  return loaderPromise;
}
