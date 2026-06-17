// Free OpenStreetMap-based helpers replacing the paid Google Maps APIs.
// - Address search & reverse geocoding via Nominatim (OpenStreetMap).
// - Driving routes via the public OSRM server.
// These are the same free services the `calculate-distance` edge function uses,
// so results stay consistent and no API key / billing is required.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const OSRM_URL = 'https://router.project-osrm.org';

// Klerksdorp / Jouberton centre for proximity-biased ranking.
export const KLERKSDORP_CENTER = { lat: -26.8523, lng: 26.6669 };

export interface AddressSuggestion {
  placeId: string;
  text: string;
  lat: number;
  lng: number;
}

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng] pairs
  distanceKm: number;
  durationMin: number;
  steps: RouteStep[];
}

export interface RouteStep {
  lat: number;
  lng: number;
  instruction: string;
}

// Search addresses with Nominatim, biased toward South Africa / Klerksdorp.
export async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  try {
    // Bounding box roughly around Klerksdorp/Jouberton to bias results.
    const viewbox = '26.30,-26.60,27.00,-27.10'; // left,top,right,bottom (lng,lat)
    const url =
      `${NOMINATIM_URL}/search?format=json&addressdetails=1&limit=8` +
      `&countrycodes=za&viewbox=${viewbox}&bounded=0` +
      `&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, {
      headers: { 'Accept-Language': 'en' },
    });
    const data = await r.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((d: any) => d?.lat && d?.lon)
      .map((d: any) => ({
        placeId: String(d.place_id),
        text: d.display_name as string,
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon),
      }));
  } catch (e) {
    console.error('Address search error:', e);
    return [];
  }
}

// Reverse geocode a coordinate to a formatted address via Nominatim.
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `${NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const r = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const d = await r.json();
    return d?.display_name || null;
  } catch (e) {
    console.error('Reverse geocode error:', e);
    return null;
  }
}

// Driving route via OSRM. Returns the route geometry, distance, duration and steps.
export async function getRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<RouteResult | null> {
  try {
    const url =
      `${OSRM_URL}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=geojson&steps=true`;
    const r = await fetch(url);
    const d = await r.json();
    const route = d?.routes?.[0];
    if (!route) return null;

    const coordinates: [number, number][] = (route.geometry?.coordinates || []).map(
      (c: [number, number]) => [c[1], c[0]], // GeoJSON is [lng,lat] → [lat,lng]
    );

    const steps: RouteStep[] = [];
    for (const leg of route.legs || []) {
      for (const step of leg.steps || []) {
        const loc = step.maneuver?.location;
        if (loc) {
          steps.push({
            lat: loc[1],
            lng: loc[0],
            instruction: describeStep(step),
          });
        }
      }
    }

    return {
      coordinates,
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMin: Math.round(route.duration / 60),
      steps,
    };
  } catch (e) {
    console.error('OSRM route error:', e);
    return null;
  }
}

// Build a human-readable instruction from an OSRM step maneuver.
function describeStep(step: any): string {
  const m = step.maneuver || {};
  const type: string = m.type || '';
  const modifier: string = m.modifier || '';
  const road: string = step.name ? ` onto ${step.name}` : '';

  switch (type) {
    case 'depart':
      return `Head out${step.name ? ' on ' + step.name : ''}`;
    case 'arrive':
      return 'You have arrived at the destination';
    case 'turn':
      return `Turn ${modifier}${road}`;
    case 'continue':
      return `Continue${modifier ? ' ' + modifier : ''}${road}`;
    case 'merge':
      return `Merge${modifier ? ' ' + modifier : ''}${road}`;
    case 'roundabout':
    case 'rotary':
      return `Take the roundabout${road}`;
    case 'fork':
      return `Keep ${modifier || 'ahead'}${road}`;
    case 'end of road':
      return `Turn ${modifier}${road}`;
    case 'new name':
      return `Continue${road}`;
    default:
      return modifier ? `Continue ${modifier}${road}` : `Continue${road}`;
  }
}

export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
