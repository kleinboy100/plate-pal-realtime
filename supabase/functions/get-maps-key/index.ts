import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Returns the Google Maps **browser** API key. This key is referrer-restricted
// in Google Cloud, so it is safe to expose to the page — Google blocks any
// domain that is not on the allowlist. Serving it from here lets the same key
// work on Lovable preview, the published site, and the custom Netlify domain.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const key = Deno.env.get("GOOGLE_MAPS_PUBLIC_KEY");
  if (!key) {
    return new Response(
      JSON.stringify({ error: "Google Maps key not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ key }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
