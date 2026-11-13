import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const adminEmail = "info@bvtcs.com.qa";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || token === authorization) return new Response("Unauthorized", { status: 401 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user || authData.user.email?.toLowerCase() !== adminEmail) {
    return new Response("Forbidden", { status: 403 });
  }
  // Require an MFA-authenticated session, not password-only login.
  try {
    const claims = JSON.parse(atob(token.split(".")[1]));
    if (claims.aal !== "aal2") return new Response("MFA verification required", { status: 403 });
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data, error } = await admin.from("bv_customer_enquiries")
    .select("created_at,customer_name,customer_phone,customer_email,service_selected,inquiry,status")
    .order("created_at", { ascending: false })
    .limit(10000);
  if (error) {
    console.error("BVTCS export query failed", error);
    return new Response("Export unavailable", { status: 500 });
  }
  const safeCell = (v: unknown) => {
    const s = String(v ?? "");
    return /^[\s]*[=+@-]/.test(s) ? "'" + s : s;
  };
  const rows = (data ?? []).map((r: Record<string, unknown>) => ({
    "Date": r.created_at ? new Date(String(r.created_at)).toISOString().slice(0, 10) : "",
    "Time (Qatar)": r.created_at ? new Date(String(r.created_at)).toLocaleTimeString("en-GB", { timeZone: "Asia/Qatar" }) : "",
    "Customer Name": safeCell(r.customer_name),
    "Customer Number": safeCell(r.customer_phone),
    "Customer Email": safeCell(r.customer_email),
    "Service / Inquiry Type": safeCell(r.service_selected),
    "Inquiry": safeCell(r.inquiry),
    "Status": safeCell(r.status),
  }));
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 26 }, { wch: 20 }, { wch: 30 }, { wch: 28 }, { wch: 60 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(workbook, sheet, "Customer Enquiries");
  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  await admin.from("bv_admin_audit_log").insert({
    admin_user_id: authData.user.id,
    action: "export_enquiries",
    record_count: rows.length,
  });
  return new Response(bytes, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="BVTCS-Customer-Enquiries.xlsx"',
      "cache-control": "no-store, private",
      "x-content-type-options": "nosniff",
    },
  });
});
