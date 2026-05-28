// Singleton loader for Google Maps JS API.
// The browser key is fetched at runtime from an Edge Function so it is not
// embedded in the repo. The key itself is referrer-restricted (publishable).
let loadPromise: Promise<unknown> | null = null;
let keyPromise: Promise<{ key: string; channel: string }> | null = null;

type GoogleMapsWindow = { maps?: unknown };

declare global {
  interface Window {
    __nostyInitMap?: () => void;
    google?: GoogleMapsWindow;
    gm_authFailure?: () => void;
    __nostyMapsAuthFailed?: boolean;
  }
}


async function fetchKey(): Promise<{ key: string; channel: string }> {
  if (keyPromise) return keyPromise;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
  const supabaseUrl =
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
    (projectId ? `https://${projectId}.supabase.co` : undefined);
  if (!supabaseUrl) {
    return Promise.reject(new Error('Supabase URL not configured'));
  }
  keyPromise = fetch(`${supabaseUrl}/functions/v1/get-maps-key`)
    .then(async (r) => {
      if (!r.ok) throw new Error(`Failed to load Maps key: ${r.status}`);
      const d = await r.json();
      if (!d?.key) throw new Error('Maps key missing in response');
      return { key: d.key as string, channel: (d.channel as string) || '' };
    })
    .catch((e) => {
      keyPromise = null;
      throw e;
    });
  return keyPromise;
}

export function loadGoogleMaps(): Promise<unknown> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.maps) return Promise.resolve(window.google);
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const { key, channel } = await fetchKey();
    return new Promise((resolve, reject) => {
      // Google calls this when the API key fails runtime auth (referrer/
      // billing/API-not-enabled). Without a handler, Google injects the
      // "Oops! Something went wrong" overlay over the map.
      window.gm_authFailure = () => {
        window.__nostyMapsAuthFailed = true;
        console.error(
          '[GoogleMaps] Authentication failed. Likely causes: Maps JavaScript API not enabled, billing not configured, or referrer not allowed for this key. Current origin:',
          window.location.origin,
        );
      };
      window.__nostyInitMap = () => {
        if (window.__nostyMapsAuthFailed) {
          reject(new Error('Google Maps authentication failed'));
          return;
        }
        resolve(window.google);
      };
      const s = document.createElement('script');
      s.async = true;
      s.defer = true;
      const channelParam = channel ? `&channel=${encodeURIComponent(channel)}` : '';
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=geometry,places&loading=async&callback=__nostyInitMap${channelParam}`;
      s.onerror = () => {
        loadPromise = null;
        reject(new Error('Failed to load Google Maps script'));
      };
      document.head.appendChild(s);
    });
  })();

  return loadPromise;
}
