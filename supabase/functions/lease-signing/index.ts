import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function computeOverallStatus(signers: { role: string; status: string }[]): string {
  const external = signers.filter((s) => s.role !== "owner");
  if (external.some((s) => s.status === "declined")) return "declined";
  if (external.every((s) => s.status === "signed")) {
    const owner = signers.find((s) => s.role === "owner");
    if (owner?.status === "signed") return "executed";
    return "ready_to_countersign";
  }
  if (external.some((s) => s.status === "signed")) return "partially_signed";
  return "pending";
}

async function sendTestEmail(
  to: string,
  signerName: string,
  role: string,
  signUrl: string,
  leaseInfo: string,
) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const testInbox = Deno.env.get("SIGNING_TEST_INBOX") || "leasing@auranewyork.com";
  if (!resendKey) return { skipped: true };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "leasing@auranewyork.com",
        to: [testInbox],
        subject: `[TEST — to: ${to}] Lease signing request for ${signerName}`,
        html: `<p><strong>TEST MODE</strong> — This email would go to <em>${to}</em> (${role}).</p>
               <p>Lease: ${leaseInfo}</p>
               <p><a href="${signUrl}">Click here to sign</a></p>
               <p>Sign URL: ${signUrl}</p>`,
      }),
    });
    return { sent: res.ok };
  } catch {
    return { error: "email_failed" };
  }
}

async function handleInit(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, string>,
  req: Request,
) {
  const { leaseId } = body;
  if (!leaseId) return json({ ok: false, error: "leaseId required" }, 400);

  const { data: lease, error: leaseErr } = await supabase
    .from("lease_documents")
    .select("id, answers")
    .eq("id", leaseId)
    .single();
  if (leaseErr || !lease) return json({ ok: false, error: "Lease not found" }, 404);

  const answers = (lease.answers ?? {}) as Record<string, string>;
  const tenantNames: string[] = (answers.TenantName || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  let tenantEmails: string[] = [];
  try { tenantEmails = JSON.parse(answers.tenantEmails || "[]"); } catch { /* */ }
  const guarantorCount = parseInt(answers.GuarantorCount || "0", 10) || 0;
  let guarantors: { name: string; email: string }[] = [];
  try { guarantors = JSON.parse(answers.guarantors || "[]"); } catch { /* */ }

  const frontendUrl =
    Deno.env.get("FRONTEND_URL") ||
    req.headers.get("origin") ||
    "https://localhost:5173";
  const leaseInfo = `${answers.BuildingName || ""} Apt ${answers["Apt#"] || ""} — ${answers.TenantName || ""}`;

  // Delete existing signers for clean re-init
  await supabase.from("lease_signers").delete().eq("lease_id", leaseId);

  const signerRows: {
    lease_id: string;
    role: string;
    signer_index: number;
    name: string;
    email: string | null;
    token: string;
  }[] = [];

  for (let i = 0; i < tenantNames.length; i++) {
    signerRows.push({
      lease_id: leaseId,
      role: "tenant",
      signer_index: i,
      name: tenantNames[i],
      email: tenantEmails[i] || (i === 0 ? (answers.TenantEmail || null) : null),
      token: crypto.randomUUID(),
    });
  }
  for (let i = 0; i < guarantorCount; i++) {
    const g = guarantors[i] ?? { name: `Guarantor ${i + 1}`, email: null };
    signerRows.push({
      lease_id: leaseId,
      role: "guarantor",
      signer_index: i,
      name: g.name || `Guarantor ${i + 1}`,
      email: g.email || null,
      token: crypto.randomUUID(),
    });
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("lease_signers")
    .insert(signerRows)
    .select("id, role, signer_index, name, email, token, status");
  if (insertErr) return json({ ok: false, error: insertErr.message }, 500);

  const emailResults: unknown[] = [];
  const signers = (inserted ?? []).map((s) => {
    const signUrl = `${frontendUrl}/sign/${s.token}`;
    return { role: s.role, index: s.signer_index, name: s.name, signUrl, status: s.status };
  });

  // Send test emails
  for (const row of inserted ?? []) {
    if (row.email) {
      const signUrl = `${frontendUrl}/sign/${row.token}`;
      const r = await sendTestEmail(row.email, row.name, row.role, signUrl, leaseInfo);
      emailResults.push({ signer: row.name, ...r });
    }
  }

  return json({ ok: true, signers, emailResults });
}

async function handleGet(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, string>,
) {
  const { token } = body;
  if (!token) return json({ ok: false, error: "token required" }, 400);

  const { data: signer, error } = await supabase
    .from("lease_signers")
    .select("id, lease_id, role, signer_index, name, email, status")
    .eq("token", token)
    .single();
  if (error || !signer) return json({ ok: false, error: "Invalid or expired token" }, 404);

  if (signer.status !== "pending") {
    return json({
      ok: true,
      signer: { role: signer.role, index: signer.signer_index, name: signer.name, status: signer.status },
      lease: null,
      pdfUrl: null,
    });
  }

  const { data: lease } = await supabase
    .from("lease_documents")
    .select("answers")
    .eq("id", signer.lease_id)
    .single();
  const answers = (lease?.answers ?? {}) as Record<string, string>;

  // Get latest artifact PDF URL
  const { data: artifact } = await supabase
    .from("lease_artifacts")
    .select("storage_path")
    .eq("lease_id", signer.lease_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let pdfUrl: string | null = null;
  if (artifact?.storage_path) {
    const { data: urlData } = await supabase.storage
      .from("lease-gen-artifacts")
      .createSignedUrl(artifact.storage_path, 3600);
    pdfUrl = urlData?.signedUrl ?? null;
  }

  return json({
    ok: true,
    signer: { role: signer.role, index: signer.signer_index, name: signer.name, status: signer.status },
    lease: {
      building: answers.BuildingName || "",
      unit: answers["Apt#"] || "",
      tenant: answers.TenantName || "",
    },
    pdfUrl,
  });
}

async function handleSign(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, string>,
) {
  const { token, signaturePngBase64, name } = body;
  if (!token) return json({ ok: false, error: "token required" }, 400);

  const { data: signer, error } = await supabase
    .from("lease_signers")
    .select("id, lease_id, status")
    .eq("token", token)
    .single();
  if (error || !signer) return json({ ok: false, error: "Invalid token" }, 404);
  if (signer.status !== "pending") return json({ ok: false, error: `Already ${signer.status}` }, 409);

  const updateData: Record<string, unknown> = {
    status: "signed",
    signed_at: new Date().toISOString(),
    signature_png: signaturePngBase64 || null,
  };
  if (name) updateData.name = name;

  await supabase.from("lease_signers").update(updateData).eq("id", signer.id);

  // Compute overall status
  const { data: allSigners } = await supabase
    .from("lease_signers")
    .select("role, status")
    .eq("lease_id", signer.lease_id);

  const overallStatus = computeOverallStatus(allSigners ?? []);
  const external = (allSigners ?? []).filter((s) => s.role !== "owner");
  const externalRemaining = external.filter((s) => s.status === "pending").length;

  return json({
    ok: true,
    status: "signed",
    externalRemaining,
    readyToCountersign: overallStatus === "ready_to_countersign",
  });
}

async function handleDecline(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, string>,
) {
  const { token, reason } = body;
  if (!token) return json({ ok: false, error: "token required" }, 400);

  const { data: signer, error } = await supabase
    .from("lease_signers")
    .select("id, status")
    .eq("token", token)
    .single();
  if (error || !signer) return json({ ok: false, error: "Invalid token" }, 404);
  if (signer.status !== "pending") return json({ ok: false, error: `Already ${signer.status}` }, 409);

  await supabase
    .from("lease_signers")
    .update({ status: "declined", declined_at: new Date().toISOString(), decline_reason: reason || null })
    .eq("id", signer.id);

  return json({ ok: true });
}

async function handleCountersign(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, string>,
) {
  const { leaseId, signaturePngBase64 } = body;
  if (!leaseId) return json({ ok: false, error: "leaseId required" }, 400);

  // Upsert owner signer record
  const { data: existing } = await supabase
    .from("lease_signers")
    .select("id")
    .eq("lease_id", leaseId)
    .eq("role", "owner")
    .maybeSingle();

  if (existing) {
    await supabase
      .from("lease_signers")
      .update({ status: "signed", signed_at: new Date().toISOString(), signature_png: signaturePngBase64 || null })
      .eq("id", existing.id);
  } else {
    await supabase.from("lease_signers").insert({
      lease_id: leaseId,
      role: "owner",
      signer_index: 0,
      name: "Owner",
      status: "signed",
      signed_at: new Date().toISOString(),
      signature_png: signaturePngBase64 || null,
    });
  }

  return json({ ok: true, status: "executed" });
}

async function handleStatus(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, string>,
) {
  const { leaseId } = body;
  if (!leaseId) return json({ ok: false, error: "leaseId required" }, 400);

  const { data: rows, error } = await supabase
    .from("lease_signers")
    .select("role, signer_index, name, status, token")
    .eq("lease_id", leaseId)
    .order("role")
    .order("signer_index");
  if (error) return json({ ok: false, error: error.message }, 500);

  const signers = (rows ?? []).map((s) => ({
    role: s.role,
    index: s.signer_index,
    name: s.name,
    status: s.status,
  }));

  return json({ ok: true, signingStatus: computeOverallStatus(signers), signers });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabase = supabaseAdmin();
    const body = await req.json() as Record<string, string>;
    const { action } = body;

    switch (action) {
      case "init": return handleInit(supabase, body, req);
      case "get": return handleGet(supabase, body);
      case "sign": return handleSign(supabase, body);
      case "decline": return handleDecline(supabase, body);
      case "countersign": return handleCountersign(supabase, body);
      case "status": return handleStatus(supabase, body);
      default: return json({ ok: false, error: "Unknown action" }, 400);
    }
  } catch (err: unknown) {
    return json({ ok: false, error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
