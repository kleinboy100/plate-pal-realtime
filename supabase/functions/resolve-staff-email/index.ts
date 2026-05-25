import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is authenticated
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ success: false, error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, restaurant_id } = await req.json();

    if (!email || !restaurant_id) {
      return new Response(JSON.stringify({ success: false, error: "Email and restaurant_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to verify caller owns this restaurant
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: restaurant } = await adminClient
      .from("restaurants")
      .select("id")
      .eq("id", restaurant_id)
      .eq("owner_id", caller.id)
      .maybeSingle();

    if (!restaurant) {
      return new Response(JSON.stringify({ success: false, error: "Not authorized for this restaurant" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up user by email using admin API
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      return new Response(JSON.stringify({ success: false, error: "Could not look up users" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUser = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (!targetUser) {
      return new Response(JSON.stringify({ success: false, error: "No account found with that email. The user must sign up first." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Don't allow adding the owner as staff
    if (targetUser.id === caller.id) {
      return new Response(JSON.stringify({ success: false, error: "You cannot add yourself as staff — you are the owner." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert staff record using service role (bypasses RLS for the insert)
    const { error: insertError } = await adminClient
      .from("restaurant_staff")
      .insert({
        restaurant_id,
        user_id: targetUser.id,
        email: email.toLowerCase().trim(),
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return new Response(JSON.stringify({ success: false, error: "This user is already a staff member." }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: false, error: "Failed to add staff member" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
