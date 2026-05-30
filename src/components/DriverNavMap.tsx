import { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMaps } from '@/lib/googleMapsLoader';
import { Loader2, Navigation, Volume2, VolumeX, Crosshair, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DriverNavMapProps {
  destination: { lat: number; lng: number; address?: string };
  origin?: { lat: number; lng: number; address?: string };
  orderLabel?: string;
  onClose?: () => void;
}

// Strip HTML tags Google embeds in maneuver instructions.
function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function DriverNavMap({ destination, origin, orderLabel, onClose }: DriverNavMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const dirServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const stepsRef = useRef<google.maps.DirectionsStep[]>([]);
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
    (async () => {
      try {
        await loadGoogleMaps();
        if (cancelled || !containerRef.current) return;
        const map = new google.maps.Map(containerRef.current, {
          center: origin || destination,
          zoom: 16,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
        });
        mapRef.current = map;
        map.addListener('dragstart', () => (followRef.current = false));

        rendererRef.current = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: false,
          preserveViewport: true,
          polylineOptions: { strokeColor: '#2563eb', strokeWeight: 6, strokeOpacity: 0.9 },
        });
        dirServiceRef.current = new google.maps.DirectionsService();
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
        setLoading(false);
      } catch (e) {
        console.error('Nav map load error', e);
        if (!cancelled) {
          setError('Map unavailable. Check your connection.');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
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
    if (followRef.current) map.panTo(driverPos);

    // Recompute the route from current position at most every 12s.
    const now = Date.now();
    if (dirServiceRef.current && rendererRef.current && now - lastRouteAtRef.current > 12000) {
      lastRouteAtRef.current = now;
      dirServiceRef.current.route(
        {
          origin: driverPos,
          destination,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            rendererRef.current!.setDirections(result);
            const leg = result.routes[0]?.legs[0];
            if (leg) {
              stepsRef.current = leg.steps;
              setEta({
                km: Math.round(((leg.distance?.value ?? 0) / 1000) * 10) / 10,
                min: Math.round((leg.duration?.value ?? 0) / 60),
              });
            }
          }
        },
      );
    }

    // Voice: announce the next maneuver when close to the current step start.
    const steps = stepsRef.current;
    if (steps.length > 0) {
      let idx = 0;
      let best = Infinity;
      steps.forEach((s, i) => {
        const start = { lat: s.start_location.lat(), lng: s.start_location.lng() };
        const d = distanceMeters(driverPos, start);
        if (d < best) {
          best = d;
          idx = i;
        }
      });
      const current = steps[idx];
      const text = stripHtml(current.instructions || '');
      setInstruction(text || 'Continue to the destination');
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
      mapRef.current.panTo(driverPos);
      mapRef.current.setZoom(16);
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
      <div className="absolute top-0 inset-x-0 p-3 pt-4">
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
      <div className="absolute bottom-0 inset-x-0 p-3 pb-5 flex items-end justify-between gap-3">
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
