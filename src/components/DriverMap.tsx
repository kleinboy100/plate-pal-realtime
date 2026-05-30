import { useEffect, useRef, useState } from 'react';
import { Loader2, Navigation } from 'lucide-react';
import { loadGoogleMaps, getMapsAuthError } from '@/lib/googleMapsLoader';

interface DriverMapProps {
  destination: { lat: number; lng: number; address?: string };
  restaurant?: { lat: number; lng: number; address?: string };
  className?: string;
  onEta?: (etaMinutes: number, distanceKm: number) => void;
}

export function DriverMap({ destination, restaurant, className, onEta }: DriverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const routeLineRef = useRef<google.maps.Polyline | null>(null);
  const fittedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState<{ km: number; min: number } | null>(null);

  // Init map (retry until container has dimensions)
  useEffect(() => {
    let cancelled = false;
    let raf = 0;

    const init = async () => {
      try {
        const google = await loadGoogleMaps();

        const waitForContainer = () =>
          new Promise<void>((resolve) => {
            const check = () => {
              const el = containerRef.current;
              if (cancelled) return resolve();
              if (el && el.offsetWidth > 0 && el.offsetHeight > 0) return resolve();
              raf = requestAnimationFrame(check);
            };
            check();
          });

        await waitForContainer();
        if (cancelled || !containerRef.current) return;

        const map = new google.maps.Map(containerRef.current, {
          center: { lat: destination.lat, lng: destination.lng },
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        });
        mapRef.current = map;

        new google.maps.Marker({
          position: { lat: destination.lat, lng: destination.lng },
          map,
          title: 'Customer',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#16a34a',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
        });

        if (restaurant) {
          new google.maps.Marker({
            position: { lat: restaurant.lat, lng: restaurant.lng },
            map,
            title: 'Restaurant',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#f97316',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
            },
          });
        }

        setReady(true);
        setLoading(false);
      } catch (e) {
        console.error('Maps load error', e);
        if (!cancelled) {
          setError(getMapsAuthError() || (e instanceof Error ? e.message : 'Map unavailable'));
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch driver position
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setDriverPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn('Geo error', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Draw route + ETA. Uses the calculate-distance edge function (OSRM) which
  // needs no API key, then renders the polyline with Google Maps.
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    const google = (window as any).google as typeof globalThis.google;

    const origin = driverPos || restaurant;
    if (!origin) {
      map.setCenter({ lat: destination.lat, lng: destination.lng });
      map.setZoom(16);
      return;
    }

    if (driverPos && !driverMarkerRef.current) {
      driverMarkerRef.current = new google.maps.Marker({
        position: driverPos,
        map,
        title: 'You',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      });
    } else if (driverPos && driverMarkerRef.current) {
      driverMarkerRef.current.setPosition(driverPos);
    }

    const fetchRoute = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase.functions.invoke('calculate-distance', {
          body: { restaurantCoords: origin, customerCoords: destination },
        });
        if (data?.distanceKm != null && data?.durationMinutes != null) {
          const next = { km: data.distanceKm, min: data.durationMinutes };
          setEta(next);
          onEta?.(next.min, next.km);
        }

        let path: google.maps.LatLngLiteral[] | null = null;
        const encoded: string | undefined = data?.encodedPolyline;
        if (encoded && google.maps.geometry?.encoding) {
          try {
            path = google.maps.geometry.encoding
              .decodePath(encoded)
              .map((p) => ({ lat: p.lat(), lng: p.lng() }));
          } catch {
            path = null;
          }
        }
        if (!path || path.length === 0) {
          path = [
            { lat: origin.lat, lng: origin.lng },
            { lat: destination.lat, lng: destination.lng },
          ];
        }

        if (routeLineRef.current) routeLineRef.current.setMap(null);
        routeLineRef.current = new google.maps.Polyline({
          path,
          strokeColor: '#2563eb',
          strokeOpacity: 0.9,
          strokeWeight: 5,
          map,
        });

        if (!fittedRef.current) {
          const bounds = new google.maps.LatLngBounds();
          path.forEach((p) => bounds.extend(p));
          map.fitBounds(bounds, 60);
          fittedRef.current = true;
        }
      } catch (e) {
        console.warn('Route fetch failed', e);
      }
    };
    fetchRoute();
  }, [ready, driverPos, restaurant, destination, onEta]);

  if (error) {
    return (
      <div className={`bg-muted rounded-xl flex items-center justify-center text-sm text-muted-foreground ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center z-[1000]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      <div ref={containerRef} className="w-full h-full min-h-[280px]" />
      {eta && (
        <div className="absolute top-3 left-3 bg-card/95 backdrop-blur rounded-xl shadow-lg px-3 py-2 text-xs font-semibold flex items-center gap-2 border border-border/50 z-[1000]">
          <Navigation size={14} className="text-primary" />
          <span>{eta.km} km</span>
          <span className="text-muted-foreground">·</span>
          <span>{eta.min} min</span>
        </div>
      )}
    </div>
  );
}
