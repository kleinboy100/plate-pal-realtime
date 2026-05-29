import { supabase } from '@/integrations/supabase/client';

// Loads the Google Maps JavaScript API (with the Places library) exactly once,
// fetching the browser API key from the `get-maps-key` edge function so the
// same referrer-restricted key works on every domain (Lovable, published, and
// the custom Netlify domain).

let loaderPromise: Promise<typeof google> | null = null;

async function fetchApiKey(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('get-maps-key');
  if (error || !data?.key) {
    throw new Error('Could not load Google Maps key');
  }
  return data.key as string;
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (loaderPromise) return loaderPromise;

  loaderPromise = (async () => {
    // Already loaded.
    if (typeof window !== 'undefined' && (window as any).google?.maps?.importLibrary) {
      return (window as any).google;
    }

    const key = await fetchApiKey();

    await new Promise<void>((resolve, reject) => {
      // If a script is already on the page, wait for it.
      const existing = document.getElementById('google-maps-js') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Google Maps failed to load')));
        if ((window as any).google?.maps) resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-js';
      script.async = true;
      script.defer = true;
      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}` +
        `&libraries=places,marker,geometry&loading=async&v=weekly`;
      script.onerror = () => reject(new Error('Google Maps failed to load'));
      script.onload = () => resolve();
      document.head.appendChild(script);
    });

    // Ensure core + places libraries are initialised (loading=async).
    await (window as any).google.maps.importLibrary('maps');
    await (window as any).google.maps.importLibrary('places');

    return (window as any).google;
  })();

  return loaderPromise;
}
