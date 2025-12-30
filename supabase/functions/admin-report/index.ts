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

  const body = await req.json().catch(() => null);
  const targetUserId = body?.userId as string | undefined;
  if (!targetUserId) {
    return new Response(JSON.stringify({ error: "Missing userId" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const [profile, goals, measurement, logs] = await Promise.all([
    adminClient
      .from("profiles")
      .select("display_name, gender, timezone, activity_level, created_at")
      .eq("user_id", targetUserId)
      .maybeSingle(),
    adminClient.from("daily_goals").select("*").eq("user_id", targetUserId).maybeSingle(),
    adminClient
      .from("body_measurements")
      .select("recorded_at, height_cm, weight_kg, body_fat_pct, waist_cm")
      .eq("user_id", targetUserId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    adminClient
      .from("daily_logs")
      .select("log_date, calories_consumed, protein_g, carbs_g, fat_g, water_ml, steps")
      .eq("user_id", targetUserId)
      .gte("log_date", new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10))
      .order("log_date", { ascending: false }),
  ]);

  return new Response(
    JSON.stringify({
      profile: profile.data ?? null,
      daily_goals: goals.data ?? null,
      latest_measurement: measurement.data ?? null,
      recent_logs: logs.data ?? [],
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
