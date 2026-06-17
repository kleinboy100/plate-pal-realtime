import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Navigation, Volume2, VolumeX, Crosshair, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRoute, distanceMeters, type RouteStep } from '@/lib/freeMaps';

interface DriverNavMapProps {
  destination: { lat: number; lng: number; address?: string };
  origin?: { lat: number; lng: number; address?: string };
  orderLabel?: string;
  onClose?: () => void;
}

function navIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export function DriverNavMap({ destination, origin, orderLabel, onClose }: DriverNavMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const stepsRef = useRef<RouteStep[]>([]);
  const spokenStepRef = useRef<number>(-1);
  const lastRouteAtRef = useRef<number>(0);
  const followRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const voiceOnRef = useRef(true);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState<{ km: number; min: number } | null>(null);
  const [instruction, setInstruction] = useState<string>('Starting navigation…');

  useEffect(() => {
    voiceOnRef.current = voiceOn;
  }, [voiceOn]);

  const speak = useCallback((text: string) => {
    if (!voiceOnRef.current || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-ZA';
      u.rate = 1;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }, []);

  // Init map
  useEffect(() => {
    let cancelled = false;
    try {
      if (!containerRef.current) return;
      const center = origin || destination;
      const map = L.map(containerRef.current, {
        center: [center.lat, center.lng],
        zoom: 16,
        zoomControl: true,
        attributionControl: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      map.on('dragstart', () => (followRef.current = false));

      L.marker([destination.lat, destination.lng], {
        icon: navIcon('#16a34a'),
        title: 'Customer',
      }).addTo(map);

      setTimeout(() => map.invalidateSize(), 100);
      setLoading(false);
    } catch (e) {
      console.error('Nav map load error', e);
      if (!cancelled) {
        setError('Map unavailable. Check your connection.');
        setLoading(false);
      }
    }
    return () => {
      cancelled = true;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track driver GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Location not available on this device.');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setDriverPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn('Geo error', err),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Update driver marker + follow + recompute route + voice on each GPS update
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !driverPos) return;

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = L.marker([driverPos.lat, driverPos.lng], {
        icon: navIcon('#2563eb'),
        title: 'You',
      }).addTo(map);
    } else {
      driverMarkerRef.current.setLatLng([driverPos.lat, driverPos.lng]);
    }
    if (followRef.current) map.panTo([driverPos.lat, driverPos.lng]);

    // Recompute the route from current position at most every 12s.
    const now = Date.now();
    if (now - lastRouteAtRef.current > 12000) {
      lastRouteAtRef.current = now;
      (async () => {
        const route = await getRoute(driverPos, destination);
        if (!route || !mapRef.current) return;
        if (routeLineRef.current) routeLineRef.current.remove();
        routeLineRef.current = L.polyline(route.coordinates, {
          color: '#2563eb',
          weight: 6,
          opacity: 0.9,
        }).addTo(mapRef.current);
        stepsRef.current = route.steps;
        setEta({ km: route.distanceKm, min: route.durationMin });
      })();
    }

    // Voice: announce the next maneuver when close to the current step start.
    const steps = stepsRef.current;
    if (steps.length > 0) {
      let idx = 0;
      let best = Infinity;
      steps.forEach((s, i) => {
        const d = distanceMeters(driverPos, { lat: s.lat, lng: s.lng });
        if (d < best) {
          best = d;
          idx = i;
        }
      });
      const current = steps[idx];
      const text = current.instruction || 'Continue to the destination';
      setInstruction(text);
      if (idx !== spokenStepRef.current && best < 60) {
        spokenStepRef.current = idx;
        speak(text);
      }

      // Arrival
      const distToDest = distanceMeters(driverPos, destination);
      if (distToDest < 40 && spokenStepRef.current !== 9999) {
        spokenStepRef.current = 9999;
        const arrive = 'You have arrived at the customer.';
        setInstruction(arrive);
        speak(arrive);
      }
    }
  }, [driverPos, destination, speak]);

  const recenter = () => {
    followRef.current = true;
    if (mapRef.current && driverPos) {
      mapRef.current.setView([driverPos.lat, driverPos.lng], 16);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-background">
      <div ref={containerRef} className="absolute inset-0" />

      {loading && (
        <div className="absolute inset-0 bg-background/90 flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 bg-background/95 flex items-center justify-center p-8 text-center text-sm text-muted-foreground">
          {error}
        </div>
      )}

      {/* Top instruction banner */}
      <div className="absolute top-0 inset-x-0 p-3 pt-4 z-[1000]">
        <div className="bg-blue-600 text-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Navigation size={22} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight truncate">{instruction}</p>
            {orderLabel && <p className="text-xs text-white/80 truncate">{orderLabel}</p>}
          </div>
          {onClose && (
            <button onClick={onClose} className="shrink-0 p-1 rounded-full hover:bg-white/20" aria-label="Close navigation">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom controls + ETA */}
      <div className="absolute bottom-0 inset-x-0 p-3 pb-5 flex items-end justify-between gap-3 z-[1000]">
        <div className="bg-card/95 backdrop-blur rounded-2xl shadow-lg px-4 py-2 border border-border/50">
          {eta ? (
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span>{eta.min} min</span>
              <span className="text-muted-foreground">·</span>
              <span>{eta.km} km</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Calculating route…</span>
          )}
          {destination.address && (
            <p className="text-xs text-muted-foreground max-w-[60vw] truncate">{destination.address}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            size="icon"
            variant={voiceOn ? 'default' : 'outline'}
            onClick={() => {
              setVoiceOn((v) => !v);
              if (voiceOn && 'speechSynthesis' in window) window.speechSynthesis.cancel();
            }}
            className="rounded-full shadow-lg h-12 w-12"
            aria-label="Toggle voice guidance"
          >
            {voiceOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={recenter}
            className="rounded-full shadow-lg h-12 w-12"
            aria-label="Recenter map"
          >
            <Crosshair size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
}
