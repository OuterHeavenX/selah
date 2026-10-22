// Selah — daily reading reminders (Web Push).
// Actions (POST JSON {action, ...}; GET ?action=key also works):
//   key          → {publicKey}  the VAPID application-server key the browser subscribes with
//   subscribe    {sub, at:"HH:MM", tz}  store or update a subscription (reminder time in the reader's time zone)
//   unsubscribe  {endpoint}
//   test         {endpoint}  send one notification now (at most every 30 s per subscription)
//   tick         run by pg_cron every 5 minutes with header x-selah-cron; sends reminders that are due
// The VAPID key pair is generated here on first use and kept in public.selah_private, which only the
// service role can read; the cron secret lives in the same table. No secrets are in this code.
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Push services browsers actually use; anything else is refused.
const PUSH_HOSTS = /(^|\.)(fcm\.googleapis\.com|android\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)$/;

// Same verse-of-the-day list and order as the app (VOTD in app.js), quoted from the ASV.
const VOTD: [string, string, string][] = [
  ["John 1:1", "In the beginning was the Word, and the Word was with God, and the Word was God.", "#/read/John/1/1"],
  ["Psalm 23:1", "Jehovah is my shepherd; I shall not want.", "#/read/Psalms/23/1"],
  ["John 3:16", "For God so loved the world, that he gave his only begotten Son, that whosoever believeth on him should not perish, but have eternal life.", "#/read/John/3/16"],
  ["Romans 8:28", "And we know that to them that love God all things work together for good, even to them that are called according to his purpose.", "#/read/Romans/8/28"],
  ["Philippians 4:13", "I can do all things in him that strengtheneth me.", "#/read/Philippians/4/13"],
  ["Proverbs 3:5", "Trust in Jehovah with all thy heart, And lean not upon thine own understanding.", "#/read/Proverbs/3/5"],
  ["Isaiah 40:31", "They that wait for Jehovah shall renew their strength; they shall mount up with wings as eagles.", "#/read/Isaiah/40/31"],
  ["Matthew 11:28", "Come unto me, all ye that labor and are heavy laden, and I will give you rest.", "#/read/Matthew/11/28"],
  ["Psalm 46:1", "God is our refuge and strength, A very present help in trouble.", "#/read/Psalms/46/1"],
  ["Jeremiah 29:11", "For I know the thoughts that I think toward you, saith Jehovah, thoughts of peace, and not of evil.", "#/read/Jeremiah/29/11"],
  ["John 14:6", "I am the way, and the truth, and the life: no one cometh unto the Father, but by me.", "#/read/John/14/6"],
  ["Micah 6:8", "What doth Jehovah require of thee, but to do justly, and to love kindness, and to walk humbly with thy God?", "#/read/Micah/6/8"],
  ["Psalm 19:14", "Let the words of my mouth and the meditation of my heart Be acceptable in thy sight, O Jehovah.", "#/read/Psalms/19/14"],
  ["Lamentations 3:22", "It is of Jehovah’s lovingkindnesses that we are not consumed, because his compassions fail not.", "#/read/Lamentations/3/22"],
];

let appServer: webpush.ApplicationServer | null = null;
let publicKey = "";
async function server() {
  if (appServer) return appServer;
  let { data } = await db.from("selah_private").select("v").eq("k", "vapid").maybeSingle();
  if (!data) {
    const keys = await webpush.generateVapidKeys({ extractable: true });
    await db.from("selah_private").upsert({ k: "vapid", v: await webpush.exportVapidKeys(keys) }, { onConflict: "k", ignoreDuplicates: true });
    ({ data } = await db.from("selah_private").select("v").eq("k", "vapid").single());   // whoever won the race
  }
  const keys = await webpush.importVapidKeys(data!.v as webpush.ExportedVapidKeys, { extractable: false });
  publicKey = await webpush.exportApplicationServerKey(keys);
  appServer = await webpush.ApplicationServer.new({ contactInformation: "https://outerheavenx.github.io/selah/", vapidKeys: keys });
  return appServer;
}

// Local date and time in a time zone.
function localNow(tz: string, now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}`, y: +p.year, m: +p.month, d: +p.day };
}
const mins = (hm: string) => +hm.slice(0, 2) * 60 + +hm.slice(3, 5);
function verseFor(y: number, m: number, d: number) {
  const day = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 864e5);
  return VOTD[day % VOTD.length];
}
function validTz(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length > 64) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; }
}
function validSub(s: any): boolean {
  try {
    const u = new URL(s.endpoint);
    return u.protocol === "https:" && PUSH_HOSTS.test(u.hostname) && s.endpoint.length < 1000 &&
      typeof s.keys?.p256dh === "string" && typeof s.keys?.auth === "string" && s.keys.p256dh.length < 200 && s.keys.auth.length < 100;
  } catch { return false; }
}

async function send(row: any, payload: Record<string, unknown>) {
  const app = await server();
  try {
    await app.subscribe(row.sub).pushTextMessage(JSON.stringify(payload), { ttl: 6 * 3600, urgency: webpush.Urgency.Normal });
    if (row.fails) await db.from("selah_push_subs").update({ fails: 0 }).eq("endpoint", row.endpoint);
    return "sent";
  } catch (e) {
    const status = e instanceof webpush.PushMessageError ? e.response.status : 0;
    if (status === 404 || status === 410 || (row.fails ?? 0) >= 5) {
      await db.from("selah_push_subs").delete().eq("endpoint", row.endpoint);     // the browser dropped it
      return "gone";
    }
    await db.from("selah_push_subs").update({ fails: (row.fails ?? 0) + 1 }).eq("endpoint", row.endpoint);
    console.error("push failed", status, String(e));
    return "failed";
  }
}
function reminder(tz: string) {
  const n = localNow(tz), [ref, text, url] = verseFor(n.y, n.m, n.d);
  return { title: "Time to read", body: `“${text}” — ${ref}`, url, tag: "selah-daily" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const url = new URL(req.url);
  let body: any = {};
  if (req.method === "POST") { try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); } }
  const action = body.action ?? url.searchParams.get("action");

  if (action === "key") { await server(); return json({ publicKey }); }

  if (action === "subscribe") {
    const { sub, at, tz } = body;
    if (!validSub(sub) || typeof at !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(at) || !validTz(tz)) return json({ error: "invalid subscription" }, 400);
    // A ceiling on sign-ups, so a script can't fill the table with junk subscriptions.
    const { count } = await db.from("selah_push_subs").select("endpoint", { count: "exact", head: true });
    if ((count ?? 0) >= 20000) return json({ error: "reminders are full right now" }, 503);
    const n = localNow(tz);
    // If today's reminder time has already passed, start tomorrow.
    const last_sent = mins(n.hm) >= mins(at) ? n.date : null;
    const { error } = await db.from("selah_push_subs").upsert({
      endpoint: sub.endpoint, sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
      remind_at: at, tz, last_sent, fails: 0, updated_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });
    return error ? json({ error: error.message }, 500) : json({ ok: true });
  }

  if (action === "unsubscribe") {
    if (typeof body.endpoint !== "string") return json({ error: "endpoint required" }, 400);
    await db.from("selah_push_subs").delete().eq("endpoint", body.endpoint);
    return json({ ok: true });
  }

  if (action === "test") {
    const { data: row } = await db.from("selah_push_subs").select("*").eq("endpoint", String(body.endpoint ?? "")).maybeSingle();
    if (!row) return json({ error: "not subscribed" }, 404);
    if (row.last_test && Date.now() - new Date(row.last_test).getTime() < 30000) return json({ error: "wait a moment" }, 429);
    await db.from("selah_push_subs").update({ last_test: new Date().toISOString() }).eq("endpoint", row.endpoint);
    const r = await send(row, reminder(row.tz));
    return json({ result: r });
  }

  if (action === "tick") {
    const { data: secret } = await db.from("selah_private").select("v").eq("k", "cron").single();
    if (!secret || req.headers.get("x-selah-cron") !== secret.v) return json({ error: "forbidden" }, 403);
    // Read every subscriber page by page (a plain select stops at 1000 rows).
    const rows: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from("selah_push_subs").select("*").order("endpoint").range(from, from + 999);
      if (error) return json({ error: error.message }, 500);
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    const dueRows = rows.filter((row) => {
      const n = localNow(row.tz), late = mins(n.hm) - mins(row.remind_at);
      // Due: today's time has come, not sent today, and not hours late (e.g. after an outage).
      return late >= 0 && late <= 180 && row.last_sent !== n.date;
    });
    let sent = 0;
    // Send 25 at a time so a large list still finishes within the function's time limit.
    for (let i = 0; i < dueRows.length; i += 25) {
      await Promise.all(dueRows.slice(i, i + 25).map(async (row) => {
        const today = localNow(row.tz).date;
        await db.from("selah_push_subs").update({ last_sent: today }).eq("endpoint", row.endpoint);
        const r = await send(row, reminder(row.tz));
        if (r === "sent") sent++;
        // A temporary failure: let the next tick (5 minutes later) try again.
        else if (r === "failed") await db.from("selah_push_subs").update({ last_sent: row.last_sent }).eq("endpoint", row.endpoint);
      }));
    }
    return json({ due: dueRows.length, sent, subscribers: rows.length });
  }

  return json({ error: "unknown action" }, 400);
});
