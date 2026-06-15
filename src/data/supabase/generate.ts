import { supabase } from './client';

interface GenerateResult {
  ok: boolean;
  downloadUrl?: string;
  storagePath?: string;
  error?: string;
}

export async function generateLease(leaseId: string): Promise<GenerateResult> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lease`;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
    body: JSON.stringify({ leaseId }),
  });

  const json = await res.json();

  if (!res.ok || !json.ok) {
    return { ok: false, error: json.error || `Generation failed (${res.status})` };
  }

  return {
    ok: true,
    downloadUrl: json.downloadUrl,
    storagePath: json.storagePath,
  };
}

export async function getLeaseArtifactUrl(leaseId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('lease_artifacts')
    .select('storage_path')
    .eq('lease_id', leaseId)
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const { data: urlData } = await supabase.storage
    .from('lease-artifacts')
    .createSignedUrl(data[0].storage_path, 3600);

  return urlData?.signedUrl ?? null;
}
