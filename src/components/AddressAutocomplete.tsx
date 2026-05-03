import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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

const MANUAL_PLACEHOLDER = "Enter full address e.g 123 Ext 6, Kasi street, Jouberton";

export function AddressAutocomplete({
  value,
  onChange,
  onCoordinatesChange,
  placeholder = MANUAL_PLACEHOLDER,
  disabled = false,
  className,
  showLocationButton = false,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');
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

  const searchAddresses = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      setNotFound(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=za&limit=5&addressdetails=1`,
        { headers: { 'User-Agent': 'PlatePal-Delivery-App/1.0' } }
      );
      const data = await response.json();

      if (data && Array.isArray(data)) {
        setSuggestions(data);
        setShowDropdown(data.length > 0);
        if (data.length === 0) {
          setNotFound(true);
          setManualValue(searchQuery);
          setManualOpen(true);
        } else {
          setNotFound(false);
        }
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
    setNotFound(false);
  };

  const openManualEntry = () => {
    setManualValue(query);
    setManualOpen(true);
  };

  const handleSaveManual = () => {
    const trimmed = manualValue.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    onChange(trimmed);
    onCoordinatesChange?.(null);
    setSuggestions([]);
    setShowDropdown(false);
    setNotFound(false);
    setManualOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10 pr-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" size={18} />
        )}
      </div>

      {showLocationButton && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openManualEntry}
          className="mt-2 w-full"
        >
          <Pencil className="w-4 h-4 mr-2" />
          Enter full address
        </Button>
      )}

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
            >
              <MapPin className="text-muted-foreground shrink-0" size={16} />
              <span className="text-sm truncate">{suggestion.display_name}</span>
            </button>
          ))}
        </div>
      )}

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter full address</DialogTitle>
            <DialogDescription>
              We couldn't find a match. Please type your full address below and we'll use it as-is.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            placeholder={MANUAL_PLACEHOLDER}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveManual} disabled={!manualValue.trim()}>
              Use this address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
