// Returns the referrer-restricted Google Maps browser key.
// The key is publishable (locked to *.lovable.app / custom domain by Google
// referrer rules), but we serve it through this function so it is not
// committed to the repo's .env file.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const key = Deno.env.get("GOOGLE_MAPS_BROWSER_KEY") ?? "";
  const channel = Deno.env.get("GOOGLE_MAPS_TRACKING_ID") ?? "";

  if (!key) {
    return new Response(
      JSON.stringify({ error: "Google Maps browser key not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ key, channel }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        // Allow browsers to cache for a day; the key rarely changes.
        "Cache-Control": "public, max-age=86400",
      },
    },
  );
});
