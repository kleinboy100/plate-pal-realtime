import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Navigation } from 'lucide-react';

interface DriverMapProps {
  destination: { lat: number; lng: number; address?: string };
  restaurant?: { lat: number; lng: number; address?: string };
  className?: string;
  onEta?: (etaMinutes: number, distanceKm: number) => void;
}

// Simple coloured circle marker for customer / restaurant points.
const circleIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.25)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const driverIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.25)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Decode an encoded polyline (Google/OSRM format, precision 5).
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export function DriverMap({ destination, restaurant, className, onEta }: DriverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
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

    const init = () => {
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

      waitForContainer().then(() => {
        if (cancelled || !containerRef.current) return;
        try {
          const map = L.map(containerRef.current, {
            center: [destination.lat, destination.lng],
            zoom: 14,
            zoomControl: true,
          });
          mapRef.current = map;

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(map);

          L.marker([destination.lat, destination.lng], { icon: circleIcon('#16a34a') })
            .addTo(map)
            .bindPopup('Customer');

          if (restaurant) {
            L.marker([restaurant.lat, restaurant.lng], { icon: circleIcon('#f97316') })
              .addTo(map)
              .bindPopup('Restaurant');
          }

          setTimeout(() => map.invalidateSize(), 100);
          setReady(true);
          setLoading(false);
        } catch (e) {
          console.error('Maps load error', e);
          if (!cancelled) {
            setError('Map unavailable');
            setLoading(false);
          }
        }
      });
    };

    init();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      mapRef.current?.remove();
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

  // Draw pickup-to-customer route immediately, then switch to driver-to-customer once GPS is available.
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;

    const origin = driverPos || restaurant;
    if (!origin) {
      map.setView([destination.lat, destination.lng], 16);
      return;
    }

    if (driverPos && !driverMarkerRef.current) {
      driverMarkerRef.current = L.marker([driverPos.lat, driverPos.lng], { icon: driverIcon })
        .addTo(map)
        .bindPopup('You');
    } else if (driverPos && driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([driverPos.lat, driverPos.lng]);
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
        let path: [number, number][] | null = null;
        if (encoded) {
          try {
            path = decodePolyline(encoded);
          } catch {
            path = null;
          }
        }
        if (!path || path.length === 0) {
          path = [
            [origin.lat, origin.lng],
            [destination.lat, destination.lng],
          ];
        }

        if (routeLineRef.current) routeLineRef.current.remove();
        routeLineRef.current = L.polyline(path, {
          color: '#2563eb',
          opacity: 0.9,
          weight: 5,
        }).addTo(map);

        if (!fittedRef.current) {
          map.fitBounds(routeLineRef.current.getBounds(), { padding: [60, 60] });
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
