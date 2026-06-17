import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Navigation, Crosshair } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  searchAddresses as osmSearchAddresses,
  reverseGeocode,
  KLERKSDORP_CENTER,
  type AddressSuggestion,
} from '@/lib/freeMaps';

type LocationSource = 'search' | 'current_location' | 'pin' | 'manual';

export interface AddressLocation {
  lat: number;
  lng: number;
  address?: string;
  accuracy?: number | null;
  placeId?: string | null;
  source?: LocationSource;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onCoordinatesChange?: (coords: AddressLocation | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showLocationButton?: boolean;
}

// Build a small coloured pin marker icon for Leaflet.
function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
  });
}

export function AddressAutocomplete({
  value,
  onChange,
  onCoordinatesChange,
  placeholder = "Enter full address e.g 123 Ext 6, street name, Jouberton",
  disabled = false,
  className,
  showLocationButton = true,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<AddressLocation | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search addresses with Nominatim (OpenStreetMap).
  const searchAddresses = async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const results = await osmSearchAddresses(q);
      setSuggestions(results);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue);
    onCoordinatesChange?.(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 400);
  };

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    setSuggestions([]);
    setShowDropdown(false);

    const location: AddressLocation = {
      lat: suggestion.lat,
      lng: suggestion.lng,
      address: suggestion.text,
      placeId: suggestion.placeId,
      source: 'search',
    };
    setQuery(suggestion.text);
    onChange(suggestion.text);
    setSelectedLocation(location);
    onCoordinatesChange?.(location);
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      return;
    }

    setGettingLocation(true);
    setShowDropdown(false);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

      const address = await reverseGeocode(latitude, longitude) || `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      const location: AddressLocation = {
        lat: latitude,
        lng: longitude,
        address,
        accuracy: position.coords.accuracy,
        source: 'current_location',
      };
      setQuery(address);
      onChange(address);
      setSelectedLocation(location);
      onCoordinatesChange?.(location);
      setPinOpen(true);
    } catch (error) {
      console.error('Error getting current location:', error);
    } finally {
      setGettingLocation(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <MapPin
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={18}
        />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          disabled={disabled || gettingLocation}
          className="pl-10 pr-10"
        />
        {(loading || gettingLocation) && (
          <Loader2
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin"
            size={18}
          />
        )}
      </div>

      {showLocationButton && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUseCurrentLocation}
            disabled={disabled || gettingLocation}
            className="gap-2"
          >
            {gettingLocation ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Navigation size={16} />
            )}
            {gettingLocation ? 'Getting location...' : 'Use current location'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPinOpen(true)}
            disabled={disabled}
            className="gap-2"
          >
            <Crosshair size={16} />
            Pin exact spot
          </Button>
        </div>
      )}

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden"
        >
          {loading ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              Searching addresses...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion) => (
              <button
                key={suggestion.placeId}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
              >
                <MapPin className="text-muted-foreground shrink-0" size={16} />
                <span className="text-sm truncate">{suggestion.text}</span>
              </button>
            ))
          ) : query.length >= 3 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              Continue to type in your full address
            </div>
          ) : null}
        </div>
      )}

      <PinPickerDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        initialLocation={selectedLocation}
        fallbackAddress={query}
        onConfirm={(location) => {
          setSelectedLocation(location);
          setQuery(location.address || `Location: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
          onChange(location.address || `Location: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
          onCoordinatesChange?.(location);
          setPinOpen(false);
        }}
      />
    </div>
  );
}

function PinPickerDialog({
  open,
  onOpenChange,
  initialLocation,
  fallbackAddress,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLocation: AddressLocation | null;
  fallbackAddress: string;
  onConfirm: (location: AddressLocation) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [picked, setPicked] = useState<AddressLocation>(
    initialLocation || { ...KLERKSDORP_CENTER, address: fallbackAddress, source: 'pin' }
  );
  const [mapLoading, setMapLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPicked(initialLocation || { ...KLERKSDORP_CENTER, address: fallbackAddress, source: 'pin' });
  }, [open, initialLocation, fallbackAddress]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let raf = 0;

    const updatePickedFromLatLng = async (lat: number, lng: number) => {
      const address = await reverseGeocode(lat, lng);
      if (!cancelled) {
        setPicked((prev) => ({
          ...prev,
          lat,
          lng,
          address: address || `Pinned location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          source: 'pin',
        }));
      }
    };

    const initMap = async () => {
      setMapLoading(true);

      const waitForContainer = () => new Promise<void>((resolve) => {
        const check = () => {
          const el = mapContainerRef.current;
          if (cancelled) return resolve();
          if (el && el.offsetWidth > 0 && el.offsetHeight > 0) return resolve();
          raf = requestAnimationFrame(check);
        };
        check();
      });

      await waitForContainer();
      if (cancelled || !mapContainerRef.current) return;

      const center = initialLocation || { ...KLERKSDORP_CENTER };
      const map = L.map(mapContainerRef.current, {
        center: [center.lat, center.lng],
        zoom: initialLocation ? 18 : 14,
        zoomControl: true,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);
      mapRef.current = map;

      const marker = L.marker([center.lat, center.lng], {
        draggable: true,
        icon: pinIcon('#dc2626'),
      }).addTo(map);
      markerRef.current = marker;

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        updatePickedFromLatLng(pos.lat, pos.lng);
      });

      map.on('click', (event: L.LeafletMouseEvent) => {
        marker.setLatLng(event.latlng);
        map.panTo(event.latlng);
        updatePickedFromLatLng(event.latlng.lat, event.latlng.lng);
      });

      // Leaflet needs a size recalculation after the dialog finishes opening.
      setTimeout(() => map.invalidateSize(), 100);

      setMapLoading(false);
    };

    initMap();
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [open, initialLocation, fallbackAddress]);

  const useGpsInMap = async () => {
    if (!navigator.geolocation) return;
    setMapLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });
      const next = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      const address = await reverseGeocode(next.lat, next.lng);
      const location: AddressLocation = {
        ...next,
        address: address || `Location: ${next.lat.toFixed(6)}, ${next.lng.toFixed(6)}`,
        accuracy: position.coords.accuracy,
        source: 'current_location',
      };
      setPicked(location);
      markerRef.current?.setLatLng([next.lat, next.lng]);
      mapRef.current?.setView([next.lat, next.lng], 18);
    } finally {
      setMapLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl p-3 sm:p-4">
        <DialogHeader>
          <DialogTitle>Pin exact delivery spot</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative h-[420px] max-h-[62vh] overflow-hidden rounded-xl bg-muted">
            {mapLoading && (
              <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-muted/80 pointer-events-none">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            <div ref={mapContainerRef} className="h-full w-full" />
          </div>
          <p className="line-clamp-2 text-xs text-muted-foreground">{picked.address || fallbackAddress}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={useGpsInMap} className="gap-2">
              <Navigation size={16} />
              My GPS
            </Button>
            <Button type="button" onClick={() => onConfirm({ ...picked, source: picked.source || 'pin' })} className="btn-primary gap-2">
              <MapPin size={16} />
              Use this pin
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
