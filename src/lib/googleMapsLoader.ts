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

// Google Maps browser key from the connected Google Maps Platform setup.
// This is a public, HTTP-referrer-restricted browser key and must be provided
// by the deployment environment so the same verified key is bundled for Netlify.
const BROWSER_KEY =
  (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined) || '';
const TRACKING_ID =
  (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined) || '';

// Always use the environment-provided key. Hardcoded production keys easily go
// stale and can be rejected on custom domains like nosty.co.za.
function resolveBrowserKey(): string {
  return BROWSER_KEY;
}

let loaderPromise: Promise<typeof google> | null = null;

type GoogleMapsBootstrap = {
  importLibrary?: (library: string, ...args: unknown[]) => Promise<unknown>;
  __ib__?: () => void;
};

type GoogleMapsWindow = Window & {
    google?: { maps?: GoogleMapsBootstrap };
    gm_authFailure?: () => void;
  };

const getMapsWindow = () => window as unknown as GoogleMapsWindow;

function installBootstrap(key: string) {
  if (!key) {
    throw new Error(
      'Google Maps browser key is missing. Add VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY in Netlify and redeploy.'
    );
  }

  const bootstrapOptions: Record<string, string> = { key, v: 'weekly', loading: 'async' };
  if (TRACKING_ID) bootstrapOptions.channel = TRACKING_ID;

  // Official Google Maps JS API inline bootstrap loader.
  // Defines window.google.maps.importLibrary immediately.
  ((g: Record<string, string>) => {
    let bootstrapPromise: Promise<void> | undefined;
    const apiName = 'The Google Maps JavaScript API';
    const callbackName = '__ib__';
    const mapsWindow = getMapsWindow();
    const googleRoot = mapsWindow.google || (mapsWindow.google = {});
    const mapsRoot = googleRoot.maps || (googleRoot.maps = {});
    const requestedLibraries = new Set<string>();
    const params = new URLSearchParams();

    const load = () =>
      bootstrapPromise ||
      (bootstrapPromise = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        params.set('libraries', [...requestedLibraries].join(','));
        for (const option in g) {
          params.set(option.replace(/[A-Z]/g, (t) => '_' + t[0].toLowerCase()), g[option]);
        }
        params.set('callback', `google.maps.${callbackName}`);
        script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
        mapsRoot.__ib__ = resolve;
        script.onerror = () => {
          bootstrapPromise = undefined;
          reject(Error(apiName + ' could not load.'));
        };
        script.nonce = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce || '';
        document.head.append(script);
      }));

    if (mapsRoot.importLibrary) {
      console.warn(apiName + ' only loads once. Ignoring:', g);
    } else {
      mapsRoot.importLibrary = (library: string, ...args: unknown[]) => {
        requestedLibraries.add(library);
        return load().then(() => {
          const importLibrary = mapsRoot.importLibrary;
          if (!importLibrary) throw new Error('Google Maps library loader is unavailable.');
          return importLibrary(library, ...args);
        });
      };
    }
  })(bootstrapOptions);
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
  getMapsWindow().gm_authFailure = () => {
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
    const mapsWindow = getMapsWindow();

    // Already fully loaded.
    if (typeof window !== 'undefined' && mapsWindow.google?.maps?.importLibrary) {
      await mapsWindow.google.maps.importLibrary('maps');
      return mapsWindow.google as unknown as typeof google;
    }

    installBootstrap(resolveBrowserKey());

    // Race the library load against a timeout. If the key is rejected, Google
    // never resolves importLibrary, so we surface the captured auth error.
    const load = (async () => {
      await mapsWindow.google?.maps?.importLibrary?.('maps');
      await mapsWindow.google?.maps?.importLibrary?.('places');
      await mapsWindow.google?.maps?.importLibrary?.('marker');
      await mapsWindow.google?.maps?.importLibrary?.('geometry');
      if (!mapsWindow.google) throw new Error('Google Maps did not initialize.');
      return mapsWindow.google as unknown as typeof google;
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
