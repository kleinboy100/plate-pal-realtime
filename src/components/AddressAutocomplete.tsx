import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onCoordinatesChange?: (coords: { lat: number; lng: number } | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showLocationButton?: boolean;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

// Klerksdorp / Jouberton bounding box (approx)
// left,top,right,bottom => west,north,east,south (lon,lat,lon,lat)
const KLERKSDORP_VIEWBOX = '26.55,-26.78,26.78,-26.95';
// Klerksdorp center coords for proximity-biased ranking
const KLERKSDORP_CENTER = { lat: -26.8523, lon: 26.6669 };

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

  const fetchNominatim = async (params: string): Promise<Suggestion[]> => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'PlatePal-Delivery-App/1.0' },
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  };

  // Search addresses with strong bias toward Klerksdorp/Jouberton area.
  const searchAddresses = async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // If user didn't already mention the area, append it to improve recall
      // for township/extension-style addresses (e.g. "123 Ext 6 Kasi Street").
      const lower = q.toLowerCase();
      const mentionsArea =
        lower.includes('jouberton') ||
        lower.includes('klerksdorp') ||
        lower.includes('matlosana') ||
        lower.includes('kanana') ||
        lower.includes('alabama') ||
        lower.includes('orkney');

      const augmentedQ = mentionsArea ? q : `${q}, Jouberton, Klerksdorp`;

      // 1) Bounded search constrained to Klerksdorp viewbox (highest precision)
      const boundedParams = new URLSearchParams({
        format: 'json',
        q: augmentedQ,
        countrycodes: 'za',
        limit: '8',
        addressdetails: '1',
        viewbox: KLERKSDORP_VIEWBOX,
        bounded: '1',
      });
      let results = await fetchNominatim(boundedParams.toString());

      // 2) Fallback: viewbox bias but not bounded, country = ZA
      if (results.length === 0) {
        const biasedParams = new URLSearchParams({
          format: 'json',
          q: augmentedQ,
          countrycodes: 'za',
          limit: '8',
          addressdetails: '1',
          viewbox: KLERKSDORP_VIEWBOX,
        });
        results = await fetchNominatim(biasedParams.toString());
      }

      // 3) Last resort: original query, country-only
      if (results.length === 0) {
        const plainParams = new URLSearchParams({
          format: 'json',
          q,
          countrycodes: 'za',
          limit: '5',
          addressdetails: '1',
        });
        results = await fetchNominatim(plainParams.toString());
      }

      // Sort by proximity to Klerksdorp center so local matches surface first
      results.sort((a, b) => {
        const da =
          Math.abs(parseFloat(a.lat) - KLERKSDORP_CENTER.lat) +
          Math.abs(parseFloat(a.lon) - KLERKSDORP_CENTER.lon);
        const db =
          Math.abs(parseFloat(b.lat) - KLERKSDORP_CENTER.lat) +
          Math.abs(parseFloat(b.lon) - KLERKSDORP_CENTER.lon);
        return da - db;
      });

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

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    setQuery(suggestion.display_name);
    onChange(suggestion.display_name);
    onCoordinatesChange?.({
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
    });
    setSuggestions([]);
    setShowDropdown(false);
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

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`,
        { headers: { 'User-Agent': 'PlatePal-Delivery-App/1.0' } }
      );
      const data = await response.json();

      if (data && data.display_name) {
        const address = data.display_name;
        setQuery(address);
        onChange(address);
        onCoordinatesChange?.({ lat: latitude, lng: longitude });
      } else {
        const fallbackAddress = `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        setQuery(fallbackAddress);
        onChange(fallbackAddress);
        onCoordinatesChange?.({ lat: latitude, lng: longitude });
      }
    } catch (error: any) {
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseCurrentLocation}
          disabled={disabled || gettingLocation}
          className="mt-2 gap-2"
        >
          {gettingLocation ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Navigation size={16} />
          )}
          {gettingLocation ? 'Getting location...' : 'Use current location'}
        </Button>
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
                key={index}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
              >
                <MapPin className="text-muted-foreground shrink-0" size={16} />
                <span className="text-sm truncate">{suggestion.display_name}</span>
              </button>
            ))
          ) : query.length >= 3 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              Continue to type in your full address
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
