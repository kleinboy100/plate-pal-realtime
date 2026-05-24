import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
const RATE_PER_100M = 0.50; // ZAR

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

// Google geocode via gateway
async function geocode(address: string, keys: { lovable: string; gmaps: string }): Promise<Coord | null> {
  try {
    const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=za`;
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${keys.lovable}`,
        "X-Connection-Api-Key": keys.gmaps,
      },
    });
    const d = await r.json();
    const loc = d?.results?.[0]?.geometry?.location;
    if (loc) return { lat: loc.lat, lng: loc.lng };
    return null;
  } catch (e) {
    console.error("Geocode error:", e);
    return null;
  }
}

// Google Routes API computeRoutes
async function googleRoute(from: Coord, to: Coord, keys: { lovable: string; gmaps: string }) {
  try {
    const r = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${keys.lovable}`,
        "X-Connection-Api-Key": keys.gmaps,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
        destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });
    const d = await r.json();
    const route = d?.routes?.[0];
    if (!route) return null;
    const meters = route.distanceMeters as number;
    // duration like "1234s"
    const durStr = String(route.duration ?? "0s");
    const seconds = parseInt(durStr.replace("s", ""), 10) || Math.ceil(meters / 8.33);
    return { meters, seconds };
  } catch (e) {
    console.error("Routes error:", e);
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
  return Math.round((meters / 100) * RATE_PER_100M * 100) / 100;
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

    const lovable = Deno.env.get("LOVABLE_API_KEY");
    const gmaps = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!lovable || !gmaps) {
      console.error("Missing Google Maps connector credentials");
    }

    const body: RequestBody = await req.json();

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
    const keys = { lovable: lovable!, gmaps: gmaps! };

    if (!rc && body.restaurantAddress && lovable && gmaps) rc = await geocode(body.restaurantAddress, keys);
    if (!cc && body.customerAddress && lovable && gmaps) cc = await geocode(body.customerAddress, keys);

    if (!rc || !cc) {
      // Cannot compute — return clear error so client knows
      return new Response(JSON.stringify({
        error: "Could not determine coordinates",
        distanceKm: null,
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Try Google Routes
    if (lovable && gmaps) {
      const route = await googleRoute(rc, cc, keys);
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
          method: "google-routes",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Haversine fallback
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
