// Supabase Edge Function: Delete Auth User and profile
// Deploy: supabase functions deploy delete-user
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  } as Record<string, string>;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "SERVICE_ROLE_KEY not set in function secrets" }), { status: 500, headers: getCorsHeaders(req) });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { id } = await req.json();
    if (!id || typeof id !== "string") {
      return new Response(JSON.stringify({ error: "id is required" }), { status: 400, headers: getCorsHeaders(req) });
    }

    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) {
      const msg = (error.message || "").toLowerCase();
      const isNotFound = /not.*found|does.*not.*exist/i.test(msg);
      if (!isNotFound) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: getCorsHeaders(req) });
      }
      // proceed to delete profile even if auth user is missing
    }

    // Clean up profile if present
    await supabase.from("profiles").delete().eq("id", id);

    return new Response(JSON.stringify({ success: true }), { headers: getCorsHeaders(req) });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: getCorsHeaders(req) });
  }
});