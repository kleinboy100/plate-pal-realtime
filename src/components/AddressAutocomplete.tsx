import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Navigation, Crosshair } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { loadGoogleMaps } from '@/lib/googleMapsLoader';

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

interface Suggestion {
  placeId: string;
  primary: string;
  secondary: string;
}

// Klerksdorp / Jouberton center for location bias.
const KLERKSDORP_CENTER = { lat: -26.8523, lng: 26.6669 };

// Reverse-geocode via Google Geocoder.
const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const google = await loadGoogleMaps();
    const geocoder = new google.maps.Geocoder();
    const { results } = await geocoder.geocode({ location: { lat, lng } });
    return results?.[0]?.formatted_address || null;
  } catch {
    return null;
  }
};

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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<AddressLocation | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<any>(null);

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

  // Search addresses with Google Places (New), biased to Klerksdorp/Jouberton.
  const searchAddresses = async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const google = await loadGoogleMaps();
      const { AutocompleteSuggestion, AutocompleteSessionToken } =
        (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;

      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new AutocompleteSessionToken();
      }

      const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q,
        sessionToken: sessionTokenRef.current,
        includedRegionCodes: ['za'],
        locationBias: {
          center: KLERKSDORP_CENTER,
          radius: 30000,
        },
      });

      const mapped: Suggestion[] = (results || [])
        .filter((s) => s.placePrediction)
        .map((s) => ({
          placeId: s.placePrediction!.placeId,
          primary: s.placePrediction!.mainText?.text || s.placePrediction!.text.text,
          secondary: s.placePrediction!.secondaryText?.text || '',
        }));

      setSuggestions(mapped);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setSuggestions([]);
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

  const handleSelectSuggestion = async (suggestion: Suggestion) => {
    setShowDropdown(false);
    setLoading(true);
    try {
      const google = await loadGoogleMaps();
      const { Place } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
      const place = new Place({ id: suggestion.placeId });
      await place.fetchFields({ fields: ['location', 'formattedAddress', 'displayName'] });

      const address =
        place.formattedAddress ||
        [suggestion.primary, suggestion.secondary].filter(Boolean).join(', ');
      const loc = place.location;

      const location: AddressLocation | null = loc
        ? {
            lat: loc.lat(),
            lng: loc.lng(),
            address,
            placeId: suggestion.placeId,
            source: 'search',
          }
        : null;

      setQuery(address);
      onChange(address);
      setSelectedLocation(location);
      onCoordinatesChange?.(location);
      // Reset session token after a selection (Places billing best practice).
      sessionTokenRef.current = null;
    } catch (error) {
      console.error('Error fetching place details:', error);
    } finally {
      setLoading(false);
      setSuggestions([]);
    }
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
            suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.placeId}-${index}`}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
              >
                <MapPin className="text-muted-foreground shrink-0" size={16} />
                <span className="flex flex-col min-w-0">
                  <span className="text-sm truncate">{suggestion.primary}</span>
                  {suggestion.secondary && (
                    <span className="text-xs text-muted-foreground truncate">{suggestion.secondary}</span>
                  )}
                </span>
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
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
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
      const google = await loadGoogleMaps();

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
      const map = new google.maps.Map(mapContainerRef.current, {
        center: { lat: center.lat, lng: center.lng },
        zoom: initialLocation ? 18 : 14,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
      });
      mapRef.current = map;

      const marker = new google.maps.Marker({
        position: { lat: center.lat, lng: center.lng },
        map,
        draggable: true,
      });
      markerRef.current = marker;

      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) updatePickedFromLatLng(pos.lat(), pos.lng());
      });

      map.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;
        marker.setPosition(event.latLng);
        map.panTo(event.latLng);
        updatePickedFromLatLng(event.latLng.lat(), event.latLng.lng());
      });

      setMapLoading(false);
    };

    initMap();
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      markerRef.current = null;
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
      markerRef.current?.setPosition(next);
      mapRef.current?.setCenter(next);
      mapRef.current?.setZoom(18);
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
