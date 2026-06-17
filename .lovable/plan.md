# Switch maps from Google to free OpenStreetMap

## Goal
The "This page can't load Google Maps correctly" error happens because the Google Cloud key has run out of credit/billing. We'll replace all browser Google Maps usage with **Leaflet + OpenStreetMap** (already installed) plus the free **Nominatim** (geocoding/search) and **OSRM** (driving routes) services — which your backend already uses. No paid key needed, and the error goes away for users.

## What uses Google Maps today
1. `src/components/AddressAutocomplete.tsx` — address search, reverse geocoding, and the "Pin exact spot" map.
2. `src/components/DriverMap.tsx` — customer/restaurant markers + driving route + ETA.
3. `src/components/DriverNavMap.tsx` — full-screen turn-by-turn driver navigation with voice.
4. `src/lib/googleMapsLoader.ts` — loader for the Google JS API.

## Changes

### 1. New free-map helpers (`src/lib/freeMaps.ts`)
- `searchAddresses(query)` → Nominatim search (biased to South Africa / Klerksdorp area), returns `{ text, lat, lng, placeId }[]`.
- `reverseGeocode(lat, lng)` → Nominatim reverse lookup, returns a formatted address string.
- `getRoute(from, to)` → OSRM driving route, returns `{ coordinates: [lat,lng][], distanceKm, durationMin, steps }`.
- All calls go directly to the public OSM/OSRM endpoints (same ones the `calculate-distance` edge function already uses), with graceful fallbacks.

### 2. `AddressAutocomplete.tsx`
- Replace Google Places autocomplete with `searchAddresses` (debounced, same dropdown UI).
- Replace Google reverse geocode with the Nominatim version.
- Rebuild the "Pin exact spot" dialog map with **Leaflet**: OSM tile layer, a draggable marker, click-to-move, and the "My GPS" button — same behavior, same UX.

### 3. `DriverMap.tsx`
- Rebuild with Leaflet: customer marker (green), restaurant marker (orange), driver marker (blue), OSM tiles.
- Draw the route polyline from OSRM and show the same km / min ETA badge via `onEta`.

### 4. `DriverNavMap.tsx`
- Rebuild with Leaflet: full-screen map, driver + customer markers, OSRM route polyline, follow-driver panning, recenter button.
- Keep voice guidance using OSRM step instructions (announce next maneuver when near it, plus arrival). Keep the existing top banner and bottom ETA/controls UI.

### 5. Cleanup
- Remove `src/lib/googleMapsLoader.ts` and all `loadGoogleMaps` imports.
- Leave the `get-maps-key` edge function in place (harmless; can be removed later).

## Notes / trade-offs
- Free OSM autocomplete is slightly less "fancy" than Google Places, but works well for SA addresses and is what your delivery distance calc already relies on, so results stay consistent.
- Turn-by-turn voice will use OSRM step text instead of Google's, so phrasing differs slightly but remains clear.
- The public OSRM/Nominatim servers are rate-limited for very heavy traffic; fine for normal restaurant volume. If you later outgrow them we can self-host or use a paid tier.

## Verification
- Load the cart/checkout address field: search, current location, and pin picker all work with no Google error.
- Driver dashboard: route + ETA render on Leaflet; navigation view tracks GPS and speaks directions.
- Confirm no remaining `loadGoogleMaps` / `google.maps` references and a clean build.
