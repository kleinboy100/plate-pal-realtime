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

const GOOGLE_MAPS_BROWSER_KEY = 'AIzaSyAZLLgYkblCL3mambA14hl52DWayMBR18A';

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

export function loadGoogleMaps(): Promise<typeof google> {
  if (loaderPromise) return loaderPromise;

  loaderPromise = (async () => {
    // Already fully loaded.
    if (typeof window !== 'undefined' && (window as any).google?.maps?.importLibrary) {
      await (window as any).google.maps.importLibrary('maps');
      return (window as any).google;
    }

    installBootstrap(GOOGLE_MAPS_BROWSER_KEY);

    // Initialise the libraries we use.
    await (window as any).google.maps.importLibrary('maps');
    await (window as any).google.maps.importLibrary('places');
    await (window as any).google.maps.importLibrary('marker');
    await (window as any).google.maps.importLibrary('geometry');

    return (window as any).google;
  })();

  return loaderPromise;
}
