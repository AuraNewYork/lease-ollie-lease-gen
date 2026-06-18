const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lease-signing`;

function headers() {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
    apikey: key,
  };
}

async function call<T>(body: object): Promise<T> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

export interface Signer {
  role: string;
  index: number;
  name: string;
  signUrl?: string;
  status?: string;
  email?: string;
}

export interface InitSigningResult {
  ok: boolean;
  signers: Signer[];
  emailResults?: unknown;
  error?: string;
}

export interface GetSigningResult {
  ok: boolean;
  signer?: { role: string; index: number; name: string; status: string };
  lease?: { building: string; unit: string; tenant: string };
  pdfUrl?: string;
  error?: string;
}

export interface SubmitSignatureResult {
  ok: boolean;
  status?: string;
  externalRemaining?: number;
  readyToCountersign?: boolean;
  error?: string;
}

export interface SigningStatusResult {
  ok: boolean;
  signingStatus?: string;
  signers?: Signer[];
  error?: string;
}

export function initSigning(leaseId: string): Promise<InitSigningResult> {
  return call({ action: 'init', leaseId });
}

export function getSigning(token: string): Promise<GetSigningResult> {
  return call({ action: 'get', token });
}

export function submitSignature(
  token: string,
  signaturePngBase64: string,
  name?: string,
): Promise<SubmitSignatureResult> {
  return call({ action: 'sign', token, signaturePngBase64, name });
}

export function declineSignature(token: string, reason?: string): Promise<{ ok: boolean; error?: string }> {
  return call({ action: 'decline', token, reason });
}

export function countersign(
  leaseId: string,
  signaturePngBase64: string,
): Promise<{ ok: boolean; status?: string; error?: string }> {
  return call({ action: 'countersign', leaseId, signaturePngBase64 });
}

export function signingStatus(leaseId: string): Promise<SigningStatusResult> {
  return call({ action: 'status', leaseId });
}
