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
  const polylineRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState<{ km: number; min: number } | null>(null);

  // Init map
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        const map = new g.maps.Map(containerRef.current, {
          center: destination,
          zoom: 14,
          disableDefaultUI: false,
          fullscreenControl: false,
          streetViewControl: false,
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

        setLoading(false);
      })
      .catch((e) => {
        console.error('Maps load error', e);
        setError('Map unavailable');
        setLoading(false);
      });

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

  // Update driver marker + route line + ETA
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !driverPos || !window.google) return;
    const g = window.google;

    if (!driverMarkerRef.current) {
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
      const bounds = new g.maps.LatLngBounds();
      bounds.extend(driverPos);
      bounds.extend(destination);
      map.fitBounds(bounds, 60);
    } else {
      driverMarkerRef.current.setPosition(driverPos);
    }

    // Simple straight polyline (visual cue). For real routing we use Routes API below.
    if (polylineRef.current) polylineRef.current.setMap(null);
    polylineRef.current = new g.maps.Polyline({
      map,
      path: [driverPos, destination],
      strokeColor: '#2563eb',
      strokeOpacity: 0.6,
      strokeWeight: 4,
    });

    // ETA via Routes API through our edge function
    const fetchEta = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase.functions.invoke('calculate-distance', {
          body: {
            restaurantCoords: driverPos,
            customerCoords: destination,
          },
        });
        if (data?.distanceKm != null && data?.durationMinutes != null) {
          const next = { km: data.distanceKm, min: data.durationMinutes };
          setEta(next);
          onEta?.(next.min, next.km);
        }
      } catch (e) {
        console.warn('ETA fetch failed', e);
      }
    };
    fetchEta();
  }, [driverPos, destination, onEta]);

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
