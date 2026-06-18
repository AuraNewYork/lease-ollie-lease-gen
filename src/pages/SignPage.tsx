import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getSigning, submitSignature, declineSignature } from '@/data/supabase/signing';
import type { GetSigningResult } from '@/data/supabase/signing';
import SignaturePad, { type SignaturePadHandle } from '@/components/SignaturePad';
import { Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, PenLine } from 'lucide-react';

export default function SignPage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GetSigningResult | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [declined, setDeclined] = useState(false);

  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const padRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    if (!token) { setFetchError('No token provided.'); setLoading(false); return; }
    getSigning(token)
      .then((r) => { setData(r); setLoading(false); })
      .catch(() => { setFetchError('Failed to load signing page.'); setLoading(false); });
  }, [token]);

  async function handleSign() {
    if (!token) return;
    if (!padRef.current || padRef.current.isEmpty()) {
      setSubmitError('Please provide your signature before submitting.');
      return;
    }
    const png = padRef.current.getDataUrl();
    if (!png) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await submitSignature(token, png);
      if (r.ok) { setSigned(true); }
      else { setSubmitError(r.error || 'Signing failed. Please try again.'); }
    } catch {
      setSubmitError('Signing failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline() {
    if (!token) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await declineSignature(token, declineReason || undefined);
      setDeclined(true);
    } catch {
      setSubmitError('Failed to decline. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (fetchError || !data?.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm w-full text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h1 className="text-lg font-semibold text-slate-900">This link is no longer valid</h1>
          <p className="text-sm text-slate-500">{fetchError || data?.error || 'The signing link may have expired or already been used.'}</p>
        </div>
      </div>
    );
  }

  const alreadyActed = data.signer?.status && data.signer.status !== 'pending';

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
          <h1 className="text-xl font-semibold text-slate-900">Signature received</h1>
          <p className="text-sm text-slate-500">
            Thank you, {data.signer?.name}. Your signature has been recorded. You will receive a copy of the executed lease once all parties have signed.
          </p>
        </div>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
          <h1 className="text-xl font-semibold text-slate-900">Signing declined</h1>
          <p className="text-sm text-slate-500">You have declined to sign this document. The landlord has been notified.</p>
        </div>
      </div>
    );
  }

  if (alreadyActed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm w-full text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-slate-400 mx-auto" />
          <h1 className="text-lg font-semibold text-slate-900">Already {data.signer!.status}</h1>
          <p className="text-sm text-slate-500">This document has already been {data.signer!.status} by {data.signer?.name}.</p>
        </div>
      </div>
    );
  }

  const lease = data.lease;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Lease signing request</p>
          <h1 className="text-xl font-semibold text-slate-900 mt-0.5">
            {lease?.building ? `${lease.building}${lease.unit ? ` · Apt ${lease.unit}` : ''}` : 'Residential Lease'}
          </h1>
          {lease?.tenant && <p className="text-sm text-slate-500 mt-0.5">Tenant: {lease.tenant}</p>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Signer identification */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-sm text-slate-500">You are signing as</p>
          <p className="text-lg font-semibold text-slate-900 mt-0.5">{data.signer?.name}</p>
          <p className="text-sm text-slate-500 capitalize">{data.signer?.role}</p>
        </div>

        {/* PDF preview */}
        {data.pdfUrl && (
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Review the lease</h2>
            <div className="border border-slate-200 rounded-lg overflow-hidden" style={{ height: '500px' }}>
              <iframe src={data.pdfUrl} className="w-full h-full" title="Lease Document" />
            </div>
          </div>
        )}

        {/* Signature */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Your signature</h2>
          <SignaturePad ref={padRef} />

          {submitError && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>{submitError}</p>
            </div>
          )}

          {!showDecline ? (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleSign}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                {submitting ? 'Submitting...' : 'Sign document'}
              </button>
              <button
                type="button"
                onClick={() => setShowDecline(true)}
                className="text-sm text-slate-400 hover:text-red-500 transition-colors"
              >
                Decline to sign
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-700 font-medium">Reason for declining (optional)</p>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
                placeholder="e.g. Terms need to be revised"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Declining...' : 'Confirm decline'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDecline(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center pb-8">
          By clicking "Sign document" you agree that your electronic signature is legally binding.
        </p>
      </main>
    </div>
  );
}
