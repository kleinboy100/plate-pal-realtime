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

    // Verify the caller is authenticated using getClaims (compatible with signing keys)
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: claimsData, error: authError } = await anonClient.auth.getClaims(token);
    const callerId = claimsData?.claims?.sub as string | undefined;
    if (authError || !callerId) {
      return new Response(JSON.stringify({ success: false, error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const caller = { id: callerId };

    const { email, restaurant_id, role = "staff" } = await req.json();

    if (!email || !restaurant_id) {
      return new Response(JSON.stringify({ success: false, error: "Email and restaurant_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetTable = role === "driver" ? "restaurant_drivers" : "restaurant_staff";
    const roleLabel = role === "driver" ? "driver" : "staff member";

    // Use service role to verify caller owns this restaurant
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: restaurant } = await adminClient
      .from("restaurants")
      .select("id")
      .eq("id", restaurant_id)
      .eq("owner_id", caller.id)
      .maybeSingle();

    // Allow either the owner or an existing staff member of this restaurant
    let authorized = !!restaurant;
    if (!authorized) {
      const { data: staffRow } = await adminClient
        .from("restaurant_staff")
        .select("id")
        .eq("restaurant_id", restaurant_id)
        .eq("user_id", caller.id)
        .maybeSingle();
      authorized = !!staffRow;
    }

    if (!authorized) {
      return new Response(JSON.stringify({ success: false, error: "Not authorized for this restaurant" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up user by email across paginated admin list
    const emailLower = email.toLowerCase().trim();
    let targetUser: any = null;
    let page = 1;
    const perPage = 1000;
    // up to 10,000 users
    for (let i = 0; i < 10 && !targetUser; i++) {
      const { data, error: listError } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (listError) {
        return new Response(JSON.stringify({ success: false, error: "Could not look up users" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const users = data?.users || [];
      targetUser = users.find((u: any) => u.email?.toLowerCase() === emailLower);
      if (users.length < perPage) break;
      page += 1;
    }

    if (!targetUser) {
      return new Response(JSON.stringify({ success: false, error: "No account found with that email. The user must sign up first." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Don't allow adding the owner to their own role tables
    if (targetUser.id === caller.id) {
      return new Response(JSON.stringify({ success: false, error: `You cannot add yourself as ${roleLabel} — you are the owner.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert role record using service role (bypasses RLS for the insert)
    const { error: insertError } = await adminClient
      .from(targetTable)
      .insert({
        restaurant_id,
        user_id: targetUser.id,
        email: email.toLowerCase().trim(),
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return new Response(JSON.stringify({ success: false, error: `This user is already a ${roleLabel}.` }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: false, error: `Failed to add ${roleLabel}` }), {
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
