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

export function AddressAutocomplete({
  value,
  onChange,
  onCoordinatesChange,
  placeholder = "Enter full address e.g 123 Ext 6, street name, Jouberton",
  disabled = false,
  className,
  showLocationButton = false
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
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

  // Search addresses using OpenStreetMap Nominatim (free, no API key)
  const searchAddresses = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=za&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'PlatePal-Delivery-App/1.0'
          }
        }
      );
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        setSuggestions(data);
        setShowDropdown(true);
      }
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

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 400); // Slightly longer debounce for Nominatim rate limits
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    setQuery(suggestion.display_name);
    onChange(suggestion.display_name);
    onCoordinatesChange?.({
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
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
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode using OpenStreetMap Nominatim (free, no API key)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'PlatePal-Delivery-App/1.0'
          }
        }
      );
      const data = await response.json();

      if (data && data.display_name) {
        // Use the formatted display_name from Nominatim
        const address = data.display_name;
        setQuery(address);
        onChange(address);
        onCoordinatesChange?.({ lat: latitude, lng: longitude });
      } else {
        // Fallback to coordinate string if reverse geocoding fails
        const fallbackAddress = `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        setQuery(fallbackAddress);
        onChange(fallbackAddress);
        onCoordinatesChange?.({ lat: latitude, lng: longitude });
      }
    } catch (error: any) {
      console.error('Error getting current location:', error);
      if (error.code === 1) {
        console.error('Location permission denied');
      } else if (error.code === 2) {
        console.error('Location unavailable');
      } else if (error.code === 3) {
        console.error('Location request timed out');
      }
    } finally {
      setGettingLocation(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
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
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" size={18} />
        )}
      </div>

      {/* External "Use current location" button */}
      {showLocationButton && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseCurrentLocation}
          disabled={gettingLocation}
          className="mt-2 w-full"
        >
          {gettingLocation ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Getting location...
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4 mr-2" />
              Use current location
            </>
          )}
        </Button>
      )}

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden"
        >
          {/* Use Current Location */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors border-b border-border"
            disabled={gettingLocation}
          >
            <div className="p-2 rounded-full bg-primary/10">
              <Navigation className="text-primary" size={16} />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">Use current location</p>
              <p className="text-xs text-muted-foreground">Get your GPS location</p>
            </div>
          </button>

          {/* Suggestions */}
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
          ) : null}
        </div>
      )}
    </div>
  );
}
