import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Maps rider id → display name and template key
const RIDER_REGISTRY: Record<string, { label: string; templateKey: string }> = {
  windowGuard:       { label: "Window Guard Notice (English)",                        templateKey: "rbn-a1978-apbe-rider-tagged.docx" },
  leadWindowAnnual:  { label: "Lead Paint / Window Falls Annual Notice (English)",    templateKey: "rbn-b1978-apbe-rider-tagged.docx" },
  bedbug:            { label: "Bedbug Infestation History",                           templateKey: "rbn-bedbug-rider-tagged.docx" },
  allergen:          { label: "Indoor Allergen Hazards Notice",                       templateKey: "rbn-allergen-rider-tagged.docx" },
  windowGuardES:     { label: "Window Guard Notice (Spanish)",                        templateKey: "rbn-a1978-apbs-rider-tagged.docx" },
  leadWindowAnnualES:{ label: "Lead Paint / Window Falls Annual Notice (Spanish)",    templateKey: "rbn-b1978-apbs-rider-tagged.docx" },
};

const MAIN_TEMPLATE_KEY = "lease-template-tagged.docx";
const TEMPLATE_BUCKET   = "lease-gen-riders";
const ARTIFACT_BUCKET   = "lease-artifacts";

// ── Adobe PDF Services helpers ────────────────────────────────────────────────

async function getAdobeToken(): Promise<string> {
  const clientId     = Deno.env.get("ADOBE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("ADOBE_CLIENT_SECRET")!;

  const body = new URLSearchParams({
    grant_type:    "client_credentials",
    client_id:     clientId,
    client_secret: clientSecret,
    scope:         "openid,AdobeID,DCAPI",
  });

  const res = await fetch("https://ims-na1.adobelogin.com/ims/token/v3", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Adobe auth failed: ${res.status}`);
  const json = await res.json();
  return json.access_token as string;
}

async function uploadAssetToAdobe(token: string, clientId: string, fileBytes: Uint8Array, mimeType: string): Promise<string> {
  // Request an upload URI
  const uploadRes = await fetch("https://pdf-services-ue1.adobe.io/assets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-api-key": clientId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mediaType: mimeType }),
  });
  if (!uploadRes.ok) throw new Error(`Adobe asset create failed: ${uploadRes.status}`);
  const { uploadUri, assetID } = await uploadRes.json();

  // PUT the file
  const putRes = await fetch(uploadUri, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: fileBytes,
  });
  if (!putRes.ok) throw new Error(`Adobe asset upload failed: ${putRes.status}`);

  return assetID as string;
}

async function pollAdobeJob(token: string, clientId: string, location: string): Promise<{ assetID: string }> {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(location, {
      headers: { Authorization: `Bearer ${token}`, "x-api-key": clientId },
    });
    if (!res.ok) throw new Error(`Adobe poll failed: ${res.status}`);
    const json = await res.json();
    if (json.status === "done") return json.output;
    if (json.status === "failed") throw new Error(`Adobe job failed: ${JSON.stringify(json)}`);
  }
  throw new Error("Adobe job timed out");
}

async function docxToPdf(token: string, clientId: string, assetID: string): Promise<string> {
  const res = await fetch("https://pdf-services-ue1.adobe.io/operation/createpdf", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-api-key": clientId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ assetID }),
  });
  if (!res.ok) throw new Error(`Adobe createpdf failed: ${res.status}`);
  const location = res.headers.get("location")!;
  const output = await pollAdobeJob(token, clientId, location);
  return output.assetID;
}

async function combinePdfs(token: string, clientId: string, assetIDs: string[]): Promise<string> {
  const assets = assetIDs.map((id) => ({ assetID: id }));
  const res = await fetch("https://pdf-services-ue1.adobe.io/operation/combinepdf", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-api-key": clientId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ assets }),
  });
  if (!res.ok) throw new Error(`Adobe combinepdf failed: ${res.status}`);
  const location = res.headers.get("location")!;
  const output = await pollAdobeJob(token, clientId, location);
  return output.assetID;
}

async function downloadAdobeAsset(token: string, clientId: string, assetID: string): Promise<Uint8Array> {
  // Get download URI
  const metaRes = await fetch(`https://pdf-services-ue1.adobe.io/assets/${assetID}`, {
    headers: { Authorization: `Bearer ${token}`, "x-api-key": clientId },
  });
  if (!metaRes.ok) throw new Error(`Adobe asset meta failed: ${metaRes.status}`);
  const { downloadUri } = await metaRes.json();

  const dlRes = await fetch(downloadUri);
  if (!dlRes.ok) throw new Error(`Adobe asset download failed: ${dlRes.status}`);
  return new Uint8Array(await dlRes.arrayBuffer());
}

async function generateDocFromTemplate(
  token: string,
  clientId: string,
  templateAssetID: string,
  mergeData: Record<string, unknown>,
): Promise<string> {
  const res = await fetch("https://pdf-services-ue1.adobe.io/operation/documentgeneration", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-api-key": clientId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assetID: templateAssetID,
      outputFormat: "pdf",
      jsonDataForMerge: mergeData,
    }),
  });
  if (!res.ok) throw new Error(`Adobe docgen failed: ${res.status}`);
  const location = res.headers.get("location")!;
  const output = await pollAdobeJob(token, clientId, location);
  return output.assetID;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { leaseId } = await req.json();
    if (!leaseId) throw new Error("leaseId required");

    // Fetch lease
    const { data: lease, error: leaseErr } = await supabase
      .from("lease_documents")
      .select("*")
      .eq("id", leaseId)
      .single();
    if (leaseErr || !lease) throw new Error(leaseErr?.message ?? "Lease not found");

    const answers: Record<string, string> = lease.answers ?? {};
    const flags: Record<string, boolean>  = lease.flags   ?? {};

    // Build merge data: spread answers then add boolean flags
    const mergeData: Record<string, unknown> = { ...answers };
    for (const [k, v] of Object.entries(flags)) {
      mergeData[k] = v;
    }

    const clientId = Deno.env.get("ADOBE_CLIENT_ID")!;
    const token    = await getAdobeToken();

    // ── Main lease template ──────────────────────────────────────────────────
    const { data: templateData, error: tplErr } = await supabase.storage
      .from(TEMPLATE_BUCKET)
      .download(MAIN_TEMPLATE_KEY);
    if (tplErr || !templateData) throw new Error(`Could not load lease template: ${tplErr?.message}`);

    const templateBytes = new Uint8Array(await templateData.arrayBuffer());
    const mainAssetID   = await uploadAssetToAdobe(token, clientId, templateBytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    const mainPdfID     = await generateDocFromTemplate(token, clientId, mainAssetID, mergeData);

    // ── Riders ───────────────────────────────────────────────────────────────
    const selectedRiders: string[] = answers.selectedRiders
      ? answers.selectedRiders.split(",").filter(Boolean)
      : [];

    const attachedRiders: string[]                         = [];
    const skippedRiders: { riderId: string; reason: string }[] = [];
    const riderPdfIDs: string[]                            = [];

    for (const riderId of selectedRiders) {
      const entry = RIDER_REGISTRY[riderId];
      if (!entry) {
        skippedRiders.push({ riderId, reason: "unknown rider id" });
        continue;
      }

      // Download rider template from storage
      const { data: riderTplData, error: riderTplErr } = await supabase.storage
        .from(TEMPLATE_BUCKET)
        .download(entry.templateKey);

      if (riderTplErr || !riderTplData) {
        skippedRiders.push({ riderId, reason: `template not found: ${entry.templateKey}` });
        continue;
      }

      try {
        const riderBytes   = new Uint8Array(await riderTplData.arrayBuffer());
        const riderAssetID = await uploadAssetToAdobe(token, clientId, riderBytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        const riderPdfID   = await generateDocFromTemplate(token, clientId, riderAssetID, mergeData);
        riderPdfIDs.push(riderPdfID);
        attachedRiders.push(riderId);
      } catch (err: unknown) {
        skippedRiders.push({ riderId, reason: err instanceof Error ? err.message : "generation error" });
      }
    }

    // ── Combine PDFs ─────────────────────────────────────────────────────────
    const allPdfIDs  = [mainPdfID, ...riderPdfIDs];
    const finalPdfID = allPdfIDs.length > 1
      ? await combinePdfs(token, clientId, allPdfIDs)
      : mainPdfID;

    const pdfBytes = await downloadAdobeAsset(token, clientId, finalPdfID);

    // ── Upload to Supabase Storage ────────────────────────────────────────────
    const storagePath = `leases/${leaseId}/lease.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from(ARTIFACT_BUCKET)
      .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

    // ── Upsert lease_artifacts ────────────────────────────────────────────────
    await supabase.from("lease_artifacts").upsert(
      {
        lease_id:     leaseId,
        artifact_type: "lease",
        storage_path: storagePath,
        filename:     "lease.pdf",
        mime_type:    "application/pdf",
        size_bytes:   pdfBytes.byteLength,
      },
      { onConflict: "lease_id,artifact_type" },
    );

    // ── Mark lease generated ─────────────────────────────────────────────────
    await supabase
      .from("lease_documents")
      .update({ status: "generated", updated_at: new Date().toISOString() })
      .eq("id", leaseId);

    // ── Signed download URL ──────────────────────────────────────────────────
    const { data: urlData } = await supabase.storage
      .from(ARTIFACT_BUCKET)
      .createSignedUrl(storagePath, 3600);
    const downloadUrl = urlData?.signedUrl ?? null;

    return new Response(
      JSON.stringify({ ok: true, leaseId, storagePath, downloadUrl, attachedRiders, skippedRiders }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
