import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED = new Set([
  "https://www.bvtcs.com.qa",
  "https://bvtcs.com.qa",
  "https://aninocloud-svg.github.io",
]);

function response(body: unknown, status = 200, origin = "") {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "vary": "Origin",
  });
  if (ALLOWED.has(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-methods", "POST, OPTIONS");
    headers.set("access-control-allow-headers", "authorization, apikey, content-type");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") return response({}, 204, origin);
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405, origin);
  if (!ALLOWED.has(origin)) return response({ error: "Origin not allowed" }, 403, origin);
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > 12000) return response({ error: "Request too large" }, 413, origin);

  try {
    const body = await req.json();
    if (typeof body.website === "string" && body.website.trim()) return response({ ok: true }, 200, origin);
    const name = String(body.customer_name ?? "").trim();
    const phone = String(body.customer_phone ?? "").trim();
    const email = String(body.customer_email ?? "").trim();
    const service = String(body.service_selected ?? "").trim();
    const inquiry = String(body.inquiry ?? "").trim();
    if (name.length < 2 || name.length > 100 || phone.length < 6 || phone.length > 32 ||
        service.length < 2 || service.length > 120 || inquiry.length < 5 || inquiry.length > 4000) {
      return response({ error: "Please check the required fields and try again." }, 400, origin);
    }
    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return response({ error: "Please enter a valid email address." }, 400, origin);
    }

    const ip = req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + SERVICE_KEY.slice(-16)));
    const fingerprint = Array.from(new Uint8Array(ipHash)).map(x => x.toString(16).padStart(2, "0")).join("");
    const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: allowed, error: rateError } = await db.rpc("bv_allow_submission", { p_ip_hash: fingerprint });
    if (rateError) throw rateError;
    if (!allowed) return response({ error: "Too many requests. Please try again in 15 minutes." }, 429, origin);

    const { error } = await db.from("bv_customer_enquiries").insert({
      customer_name: name,
      customer_phone: phone,
      customer_email: email || null,
      service_selected: service,
      inquiry,
      status: "New",
    });
    if (error) throw error;
    return response({ ok: true }, 201, origin);
  } catch (error) {
    console.error("BVTCS enquiry submission failed", error);
    return response({ error: "We could not save your enquiry. Please try again or contact us on WhatsApp." }, 500, origin);
  }
});
