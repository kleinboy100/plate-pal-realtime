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
  const mapRef = useRef<google.maps.Map | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const dirServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const fittedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState<{ km: number; min: number } | null>(null);

  // Init map
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadGoogleMaps();
        if (cancelled || !containerRef.current) return;
        const map = new google.maps.Map(containerRef.current, {
          center: destination,
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
        });
        mapRef.current = map;

        new google.maps.Marker({
          map,
          position: destination,
          title: 'Customer',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#16a34a',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
        });

        if (restaurant) {
          new google.maps.Marker({
            map,
            position: restaurant,
            title: 'Restaurant',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: '#f97316',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
            },
          });
        }

        rendererRef.current = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: { strokeColor: '#2563eb', strokeWeight: 5, strokeOpacity: 0.9 },
        });
        dirServiceRef.current = new google.maps.DirectionsService();

        setReady(true);
        setLoading(false);
      } catch (e) {
        console.error('Maps load error', e);
        if (!cancelled) {
          setError('Map unavailable');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
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

  // Draw route + driver marker
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;

    const origin = driverPos || restaurant;
    if (!origin) {
      map.setCenter(destination);
      map.setZoom(16);
      return;
    }

    if (driverPos) {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = new google.maps.Marker({
          map,
          position: driverPos,
          title: 'You',
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#2563eb',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
        });
      } else {
        driverMarkerRef.current.setPosition(driverPos);
      }
    }

    if (dirServiceRef.current && rendererRef.current) {
      dirServiceRef.current.route(
        { origin, destination, travelMode: google.maps.TravelMode.DRIVING },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            rendererRef.current!.setDirections(result);
            const leg = result.routes[0]?.legs[0];
            if (leg) {
              const next = {
                km: Math.round(((leg.distance?.value ?? 0) / 1000) * 10) / 10,
                min: Math.round((leg.duration?.value ?? 0) / 60),
              };
              setEta(next);
              onEta?.(next.min, next.km);
            }
            if (!fittedRef.current && result.routes[0]?.bounds) {
              map.fitBounds(result.routes[0].bounds, 60);
              fittedRef.current = true;
            }
          }
        },
      );
    }
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
