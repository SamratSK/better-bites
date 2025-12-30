import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  const accessToken = authHeader?.replace("Bearer ", "");
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Missing auth header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: adminProfile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (adminProfile?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const [total, members, admins, motivations, profiles] = await Promise.all([
    adminClient.from("profiles").select("*", { count: "exact", head: true }),
    adminClient.from("profiles").select("*", { count: "exact", head: true }).eq("role", "member"),
    adminClient.from("profiles").select("*", { count: "exact", head: true }).eq("role", "admin"),
    adminClient.from("motivational_messages").select("*", { count: "exact", head: true }),
    adminClient
      .from("profiles")
      .select("user_id, display_name, role, timezone, activity_level, created_at")
      .neq("user_id", userData.user.id)
      .order("created_at", { ascending: false }),
  ]);

  return new Response(
    JSON.stringify({
      counts: {
        totalUsers: total.count ?? 0,
        memberCount: members.count ?? 0,
        adminCount: admins.count ?? 0,
        motivationCount: motivations.count ?? 0,
      },
      users: (profiles.data ?? []).map((profile) => ({
        userId: profile.user_id,
        displayName: profile.display_name,
        role: profile.role,
        timezone: profile.timezone,
        activityLevel: profile.activity_level,
        createdAt: profile.created_at,
      })),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
