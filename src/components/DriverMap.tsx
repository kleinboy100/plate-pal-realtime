import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Navigation } from 'lucide-react';
import { getRoute } from '@/lib/freeMaps';

interface DriverMapProps {
  destination: { lat: number; lng: number; address?: string };
  restaurant?: { lat: number; lng: number; address?: string };
  className?: string;
  onEta?: (etaMinutes: number, distanceKm: number) => void;
}

function dotIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export function DriverMap({ destination, restaurant, className, onEta }: DriverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const fittedRef = useRef(false);
  const lastRouteAtRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState<{ km: number; min: number } | null>(null);

  // Init map
  useEffect(() => {
    let cancelled = false;
    try {
      if (!containerRef.current) return;
      const map = L.map(containerRef.current, {
        center: [destination.lat, destination.lng],
        zoom: 14,
        zoomControl: true,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);
      mapRef.current = map;

      L.marker([destination.lat, destination.lng], { icon: dotIcon('#16a34a'), title: 'Customer' }).addTo(map);
      if (restaurant) {
        L.marker([restaurant.lat, restaurant.lng], { icon: dotIcon('#f97316'), title: 'Restaurant' }).addTo(map);
      }

      setTimeout(() => map.invalidateSize(), 100);
      setReady(true);
      setLoading(false);
    } catch (e) {
      console.error('Map load error', e);
      if (!cancelled) {
        setError('Map unavailable');
        setLoading(false);
      }
    }
    return () => {
      cancelled = true;
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

  // Draw route + driver marker
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;

    const origin = driverPos || restaurant;
    if (!origin) {
      map.setView([destination.lat, destination.lng], 16);
      return;
    }

    if (driverPos) {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = L.marker([driverPos.lat, driverPos.lng], {
          icon: dotIcon('#2563eb'),
          title: 'You',
        }).addTo(map);
      } else {
        driverMarkerRef.current.setLatLng([driverPos.lat, driverPos.lng]);
      }
    }

    const now = Date.now();
    if (now - lastRouteAtRef.current < 10000 && eta) return;
    lastRouteAtRef.current = now;

    (async () => {
      const route = await getRoute(origin, destination);
      if (!route || !mapRef.current) return;
      if (routeLineRef.current) routeLineRef.current.remove();
      routeLineRef.current = L.polyline(route.coordinates, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.9,
      }).addTo(mapRef.current);

      const next = { km: route.distanceKm, min: route.durationMin };
      setEta(next);
      onEta?.(next.min, next.km);

      if (!fittedRef.current) {
        mapRef.current.fitBounds(routeLineRef.current.getBounds(), { padding: [50, 50] });
        fittedRef.current = true;
      }
    })();
  }, [ready, driverPos, restaurant, destination, onEta, eta]);

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
