// Selah — delete my account.
// POST with the signed-in user's access token (Authorization: Bearer …). The gateway checks the token
// (verify_jwt on); this function then removes the user's synced data and the account itself.
import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return json({ error: "not signed in" }, 401);
  const id = data.user.id;
  const del = await admin.from("user_data").delete().eq("user_id", id);
  if (del.error) return json({ error: del.error.message }, 500);
  const gone = await admin.auth.admin.deleteUser(id);
  if (gone.error) return json({ error: gone.error.message }, 500);
  return json({ ok: true });
});
