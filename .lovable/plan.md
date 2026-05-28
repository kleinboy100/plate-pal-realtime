# Switch Maps to Leaflet + OpenStreetMap

## Why

The Lovable-managed Google Maps key is referrer-restricted by Google to `*.lovable.app` / `*.lovableproject.com`. It cannot be used on your Netlify domain, which is why the map breaks once deployed. Lifting that restriction requires either your own Google Cloud API key + billing, or switching providers.

We will switch back to Leaflet + OpenStreetMap (Nominatim for address search, OSRM for routing). This matches your original project rule ("OpenStreetMap & OSRM exclusively. No external API keys.") and works on any domain — Netlify, custom domains, or Lovable — with no secrets, no billing, and nothing to expose.

## What changes

### Frontend

- **Install Leaflet**: add `leaflet` and `@types/leaflet` (Mapbox GL is already in package.json but we won't use it — Leaflet is lighter and matches the OSM stack).
- **`src/components/DriverMap.tsx`**: rewrite to use Leaflet. Same props (`destination`, `restaurant`, `onEta`, `className`). Renders OSM tiles, customer marker (green), restaurant marker (orange), driver marker (blue arrow) updated from `navigator.geolocation.watchPosition`. Calls the `calculate-distance` edge function for the route polyline and ETA.
- **`src/components/AddressAutocomplete.tsx`**: rewrite to use Nominatim only.
  - Search suggestions: Nominatim `/search` with `addressdetails=1`, `zoom=18`, viewbox biased to Klerksdorp/Jouberton, `bounded=1`, returning street-level results (your latest preference for exact location, not municipal).
  - "Use current location": browser GPS + Nominatim reverse geocode.
  - "Drop a pin": Leaflet map dialog with a draggable marker; on confirm, reverse-geocode the marker position.
  - Same `AddressLocation` shape and callbacks as today, so callers (`Cart.tsx`, `RestaurantRegister.tsx`, `Profile`, etc.) don't change.
- **Delete `src/lib/googleMapsLoader.ts`** — no longer needed.

### Backend (edge functions)

- **`supabase/functions/calculate-distance/index.ts`**: replace Google Routes/Geocoding paths with:
  - Geocoding fallback via Nominatim.
  - Routing via OSRM public endpoint `https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=polyline`.
  - Keeps the existing response shape (`distanceKm`, `durationMinutes`, `encodedPolyline`, `fee`) so the frontend doesn't change. Keeps the 5 km / 15 min haversine fallback.
- **Delete `supabase/functions/get-maps-key/index.ts`** and remove its `[functions.get-maps-key]` block from `supabase/config.toml`.

### Secrets / env

- Remove `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` and `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID` from `.env`.
- Optionally disconnect the Google Maps connector afterwards (you can do this from Connectors → Google Maps; not required for the app to work).

## Trade-offs to know

- **Nominatim suggestions** are less precise than Google Places, especially for informal addresses. We bias hard to the Klerksdorp/Jouberton viewbox and use `zoom=18` to keep results street-level — but for very specific spots, the "drop a pin" flow is the most reliable.
- **Nominatim usage policy** requires a descriptive User-Agent (we already send `PlatePal-Delivery-App/1.0`) and asks apps to debounce requests — we debounce to 1 every 400 ms.
- **OSRM public server** is best-effort. If it ever rate-limits, the edge function falls back to the existing 5 km / 15 min estimate so checkout never blocks.

## Verification

After implementation:
1. Address search returns street-level suggestions in Klerksdorp/Jouberton.
2. "Drop a pin" opens a Leaflet map, marker is draggable, confirm fills the address.
3. Driver tracking map renders OSM tiles, shows the route polyline and ETA.
4. `.env` no longer contains any Google Maps keys.
5. Works identically on Lovable preview and Netlify production.
