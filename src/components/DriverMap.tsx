import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/googleMapsLoader';
import { Loader2, Navigation } from 'lucide-react';

interface DriverMapProps {
  destination: { lat: number; lng: number; address?: string };
  restaurant?: { lat: number; lng: number; address?: string };
  className?: string;
  onEta?: (etaMinutes: number, distanceKm: number) => void;
}

export function DriverMap({ destination, restaurant, className, onEta }: DriverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);
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
        const g = await loadGoogleMaps();
        if (cancelled) return;

        // Wait for container to be in DOM with size
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

        const map = new g.maps.Map(containerRef.current, {
          center: destination,
          zoom: 14,
          disableDefaultUI: false,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          gestureHandling: 'greedy',
        });
        mapRef.current = map;

        new g.maps.Marker({
          map,
          position: destination,
          title: 'Customer',
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#16a34a',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
        });

        if (restaurant) {
          new g.maps.Marker({
            map,
            position: restaurant,
            title: 'Restaurant',
            icon: {
              path: g.maps.SymbolPath.CIRCLE,
              scale: 10,
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
          setError('Map unavailable');
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
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

  // Draw pickup-to-customer route immediately, then switch to driver-to-customer once GPS is available.
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    const g = (window as any).google;
    if (!map || !g) return;

    const origin = driverPos || restaurant;
    if (!origin) {
      map.setCenter(destination);
      map.setZoom(16);
      return;
    }

    if (driverPos && !driverMarkerRef.current) {
      driverMarkerRef.current = new g.maps.Marker({
        map,
        position: driverPos,
        title: 'You',
        icon: {
          path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      });
    } else if (driverPos) {
      driverMarkerRef.current.setPosition(driverPos);
    }

    // Fetch real driving route + draw the polyline
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

        const encoded: string | undefined = data?.encodedPolyline;
        let path: { lat: number; lng: number }[] | null = null;
        if (encoded && g.maps.geometry?.encoding?.decodePath) {
          const decoded = g.maps.geometry.encoding.decodePath(encoded);
          path = decoded.map((p: any) => ({ lat: p.lat(), lng: p.lng() }));
        }
        if (!path) path = [origin, destination];

        if (routePolylineRef.current) routePolylineRef.current.setMap(null);
        routePolylineRef.current = new g.maps.Polyline({
          map,
          path,
          strokeColor: '#2563eb',
          strokeOpacity: 0.9,
          strokeWeight: 5,
          geodesic: false,
        });

        if (!fittedRef.current) {
          const bounds = new g.maps.LatLngBounds();
          path.forEach((p) => bounds.extend(p));
          bounds.extend(destination);
          bounds.extend(origin);
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
        <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      <div ref={containerRef} className="w-full h-full min-h-[280px]" />
      {eta && (
        <div className="absolute top-3 left-3 bg-card/95 backdrop-blur rounded-xl shadow-lg px-3 py-2 text-xs font-semibold flex items-center gap-2 border border-border/50">
          <Navigation size={14} className="text-primary" />
          <span>{eta.km} km</span>
          <span className="text-muted-foreground">·</span>
          <span>{eta.min} min</span>
        </div>
      )}
    </div>
  );
}
