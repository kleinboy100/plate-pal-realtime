import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const OSRM_URL = "https://router.project-osrm.org";
const RATE_PER_METER = 0.9 / 100; // ZAR: 90c per 100 metres (distances of 5km or more)
const STANDARD_FLAT_FEE = 36; // ZAR flat delivery fee for distances below 5km
const FLAT_FEE_DISTANCE_M = 5000; // below 5km uses the flat fee, 5km+ uses per-metre rate


interface Coord { lat: number; lng: number; }
interface RequestBody {
  restaurantCoords?: Coord;
  customerCoords?: Coord;
  restaurantAddress?: string;
  customerAddress?: string;
}

const isCoord = (c: any): c is Coord =>
  c && typeof c.lat === "number" && typeof c.lng === "number" &&
  isFinite(c.lat) && isFinite(c.lng) &&
  c.lat >= -90 && c.lat <= 90 && c.lng >= -180 && c.lng <= 180;

// Geocode an address via Nominatim (OpenStreetMap).
async function geocode(address: string): Promise<Coord | null> {
  try {
    const url = `${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(address)}&countrycodes=za&limit=1`;
    const r = await fetch(url, { headers: { "User-Agent": "PlatePal-Delivery-App/1.0" } });
    const d = await r.json();
    const first = Array.isArray(d) ? d[0] : null;
    if (first?.lat && first?.lon) {
      return { lat: parseFloat(first.lat), lng: parseFloat(first.lon) };
    }
    return null;
  } catch (e) {
    console.error("Geocode error:", e);
    return null;
  }
}

// Driving route via OSRM public server. Returns distance (m), duration (s)
// and an encoded polyline (precision 5).
async function osrmRoute(from: Coord, to: Coord) {
  try {
    const url =
      `${OSRM_URL}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=polyline`;
    const r = await fetch(url, { headers: { "User-Agent": "PlatePal-Delivery-App/1.0" } });
    const d = await r.json();
    const route = d?.routes?.[0];
    if (!route) return null;
    return {
      meters: route.distance as number,
      seconds: route.duration as number,
      encodedPolyline: (route.geometry as string) ?? undefined,
    };
  } catch (e) {
    console.error("OSRM error:", e);
    return null;
  }
}

function haversineKm(a: Coord, b: Coord): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function feeFromMeters(meters: number): number {
  // Distances below 5km use a flat standard fee; 5km+ uses R1 per 80 metres.
  if (meters < FLAT_FEE_DISTANCE_M) return STANDARD_FLAT_FEE;
  return Math.round(meters * RATE_PER_METER * 100) / 100;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: cerr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (cerr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();

    // Alabama, Klerksdorp gets a flat standard delivery price of R43.
    const isAlabama = (body.customerAddress ?? "").toLowerCase().includes("alabama");
    if (isAlabama) {
      return new Response(JSON.stringify({
        distanceKm: null,
        distanceMeters: null,
        durationMinutes: 20,
        fee: ALABAMA_FLAT_FEE,
        customerCoords: body.customerCoords ?? null,
        restaurantCoords: body.restaurantCoords ?? null,
        method: "alabama-flat",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.restaurantCoords && !isCoord(body.restaurantCoords)) {
      return new Response(JSON.stringify({ error: "Invalid restaurant coordinates" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.customerCoords && !isCoord(body.customerCoords)) {
      return new Response(JSON.stringify({ error: "Invalid customer coordinates" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let rc: Coord | null = body.restaurantCoords || null;
    let cc: Coord | null = body.customerCoords || null;

    if (!rc && body.restaurantAddress) rc = await geocode(body.restaurantAddress);
    if (!cc && body.customerAddress) cc = await geocode(body.customerAddress);

    if (!rc || !cc) {
      return new Response(JSON.stringify({
        error: "Could not determine coordinates",
        distanceKm: null,
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Try OSRM driving route
    const route = await osrmRoute(rc, cc);
    if (route) {
      const distanceKm = Math.round((route.meters / 1000) * 10) / 10;
      const fee = feeFromMeters(route.meters);
      return new Response(JSON.stringify({
        distanceKm,
        distanceMeters: route.meters,
        durationMinutes: Math.max(1, Math.ceil(route.seconds / 60)),
        fee,
        customerCoords: cc,
        restaurantCoords: rc,
        encodedPolyline: route.encodedPolyline ?? null,
        method: "osrm",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Haversine fallback (5 km / 15 min graceful default behaviour)
    const km = haversineKm(rc, cc);
    const meters = Math.round(km * 1000);
    return new Response(JSON.stringify({
      distanceKm: Math.round(km * 10) / 10,
      distanceMeters: meters,
      durationMinutes: Math.max(5, Math.ceil(km * 2.5)),
      fee: feeFromMeters(meters),
      customerCoords: cc,
      restaurantCoords: rc,
      method: "haversine",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("calculate-distance error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
