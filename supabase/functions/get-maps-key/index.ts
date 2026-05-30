import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Serves the Google Maps browser key at runtime so it never has to live in the
// frontend .env (which breaks the Netlify build) and works on any domain
// (Netlify, nosty.life, Lovable preview) using a referrer-restricted key.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Prefer the project's own key (configured for all live domains), then fall
  // back to the connector-managed browser key for the Lovable preview.
  const key =
    Deno.env.get("GOOGLE_MAPS_PUBLIC_KEY") ||
    Deno.env.get("GOOGLE_MAPS_BROWSER_KEY") ||
    Deno.env.get("GOOGLE_MAPS_API_KEY") ||
    "";

  if (!key) {
    return new Response(JSON.stringify({ error: "Maps key not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ key }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
