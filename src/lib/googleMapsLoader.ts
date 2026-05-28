// Singleton loader for Google Maps JS API
let loadPromise: Promise<unknown> | null = null;

declare global {
  interface Window {
    __nostyInitMap?: () => void;
    google: unknown;
  }
}

export function loadGoogleMaps(): Promise<unknown> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.maps) return Promise.resolve(window.google);
  if (loadPromise) return loadPromise;

  const browserKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const channel = (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined) || '';

  if (!browserKey) return Promise.reject(new Error('Google Maps browser key missing'));

  loadPromise = new Promise((resolve, reject) => {
    window.__nostyInitMap = () => resolve(window.google);
    const s = document.createElement('script');
    s.async = true;
    s.defer = true;
    const channelParam = channel ? `&channel=${encodeURIComponent(channel)}` : '';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${browserKey}&v=weekly&libraries=geometry,places&loading=async&callback=__nostyInitMap${channelParam}`;
    s.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(s);
  });
  return loadPromise;
}
