import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWizard } from '@/context/WizardContext';
import { generateLease } from '@/data/supabase/generate';
import type { GenerateResult } from '@/data/supabase/generate';
import { updateLease } from '@/data/supabase/leases';
import {
  initSigning, signingStatus, countersign,
  type Signer, type InitSigningResult, type SigningStatusResult,
} from '@/data/supabase/signing';
import SignaturePad, { type SignaturePadHandle } from '@/components/SignaturePad';
import {
  FileText, Download, Loader as Loader2,
  CircleAlert as AlertCircle, CircleCheck as CheckCircle2,
  Copy, RefreshCw, PenLine, ArrowLeft,
} from 'lucide-react';

const RIDER_LABELS: Record<string, string> = {
  windowGuard:        'Window Guard Notice (English)',
  leadWindowAnnual:   'Lead Paint / Window Falls Annual Notice (English)',
  bedbug:             'Bedbug Infestation History',
  allergen:           'Indoor Allergen Hazards Notice',
  windowGuardES:      'Window Guard Notice (Spanish)',
  leadWindowAnnualES: 'Lead Paint / Window Falls Annual Notice (Spanish)',
  sprinkler:          'Sprinkler Disclosure (NYS §231-a)',
  stoveKnob:          'Stove Knob Covers Annual Notice (NYC)',
  smoking:            'Smoking Policy Disclosure (NYC)',
  flood:              'Flood History & Risk Notice (NYS §231-b)',
  federalLead:        'Federal Lead-Based Paint Disclosure',
  energy:             'Energy Efficiency Clause',
  ofac:               'OFAC / Anti-Terrorism Certification',
  deregulation:       'Apartment Deregulation Notice',
};

const STATUS_CLASSES: Record<string, string> = {
  pending:  'bg-slate-100 text-slate-600',
  signed:   'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  executed: 'bg-blue-100 text-blue-700',
  ready_to_countersign: 'bg-amber-100 text-amber-700',
  partially_signed:     'bg-blue-50 text-blue-600',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CLASSES[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function Step5Finalize() {
  const { leaseId, answers, flags, saving } = useWizard();

  // Generate state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // Signing state
  const [signers, setSigners] = useState<(Signer & { signUrl?: string })[] | null>(null);
  const [overallStatus, setOverallStatus] = useState<string | null>(null);
  const [signingError, setSigningError] = useState<string | null>(null);
  const [initLoading, setInitLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Countersign state
  const [showCountersign, setShowCountersign] = useState(false);
  const [countersigning, setCountersigning] = useState(false);
  const [countersignError, setCountersignError] = useState<string | null>(null);
  const [executed, setExecuted] = useState(false);
  const padRef = useRef<SignaturePadHandle>(null);

  async function handleGenerate() {
    if (!leaseId) return;

    const missing: string[] = [];
    if (!answers.BuildingName.trim()) missing.push('Building');
    if (!answers['Apt#'].trim()) missing.push('Apt #');
    if (!answers.TenantName.trim()) missing.push('Tenant Name');
    if (!answers.RentAmount.trim()) missing.push('Rent');
    if (!answers.LeaseStartDate.trim()) missing.push('Start Date');
    if (!answers.LeaseEndDate.trim()) missing.push('End Date');
    if (missing.length > 0) {
      setGenError(`Please fill in: ${missing.join(', ')}`);
      return;
    }

    setGenerating(true);
    setGenError(null);
    setResult(null);
    setSigners(null);
    setOverallStatus(null);
    setExecuted(false);
    try {
      await updateLease(leaseId, { answers, flags });
      const r = await generateLease(leaseId);
      if (r.ok && r.downloadUrl) {
        setResult(r);
      } else {
        setGenError(r.error || 'Generation failed');
      }
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleInitSigning() {
    if (!leaseId) return;
    setInitLoading(true);
    setSigningError(null);
    try {
      const r: InitSigningResult = await initSigning(leaseId);
      if (r.ok) {
        setSigners(r.signers);
        setOverallStatus('pending');
      } else {
        setSigningError(r.error || 'Failed to send for signature');
      }
    } catch (err: unknown) {
      setSigningError(err instanceof Error ? err.message : 'Failed to send for signature');
    } finally {
      setInitLoading(false);
    }
  }

  async function handleRefreshStatus() {
    if (!leaseId) return;
    setStatusLoading(true);
    try {
      const r: SigningStatusResult = await signingStatus(leaseId);
      if (r.ok) {
        setOverallStatus(r.signingStatus ?? null);
        if (r.signers) {
          setSigners((prev) =>
            (r.signers ?? []).map((s) => {
              const existing = prev?.find((p) => p.role === s.role && p.index === s.index);
              return { ...s, signUrl: existing?.signUrl };
            })
          );
        }
        if (r.signingStatus === 'executed') setExecuted(true);
      }
    } catch {
      /* silent */
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleCountersign() {
    if (!padRef.current || padRef.current.isEmpty()) {
      setCountersignError('Please draw or type your signature first.');
      return;
    }
    const png = padRef.current.getDataUrl();
    if (!png || !leaseId) return;
    setCountersigning(true);
    setCountersignError(null);
    try {
      const r = await countersign(leaseId, png);
      if (r.ok) {
        setExecuted(true);
        setOverallStatus('executed');
        setShowCountersign(false);
      } else {
        setCountersignError(r.error || 'Countersigning failed');
      }
    } catch (err: unknown) {
      setCountersignError(err instanceof Error ? err.message : 'Countersigning failed');
    } finally {
      setCountersigning(false);
    }
  }

  async function copyLink(url: string, key: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(key);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch { /* */ }
  }

  const downloadUrl          = result?.downloadUrl          ?? null;
  const attachedRiders       = result?.attachedRiders       ?? [];
  const skippedRiders        = result?.skippedRiders        ?? [];
  const attachedCustomRiders = result?.attachedCustomRiders ?? [];
  const skippedCustomRiders  = result?.skippedCustomRiders  ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Step 5: Generate Lease</h2>

      {/* Summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Summary</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div><dt className="text-slate-500">Building</dt><dd className="font-medium text-slate-900">{answers.BuildingName || '—'}</dd></div>
          <div><dt className="text-slate-500">Unit</dt><dd className="font-medium text-slate-900">{answers['Apt#'] || '—'}</dd></div>
          <div><dt className="text-slate-500">Tenant</dt><dd className="font-medium text-slate-900">{answers.TenantName || '—'}</dd></div>
          <div><dt className="text-slate-500">Rent</dt><dd className="font-medium text-slate-900">{answers.RentAmount ? `$${answers.RentAmount}` : '—'}</dd></div>
          <div><dt className="text-slate-500">Start</dt><dd className="font-medium text-slate-900">{answers.LeaseStartDate || '—'}</dd></div>
          <div><dt className="text-slate-500">End</dt><dd className="font-medium text-slate-900">{answers.LeaseEndDate || '—'}</dd></div>
        </dl>
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Active clauses:{' '}
            {Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join(', ') || 'None'}
          </p>
        </div>
      </div>

      {!leaseId && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Please complete previous steps and save progress first.
        </p>
      )}

      {genError && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>{genError}</p>
        </div>
      )}

      {downloadUrl ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">Lease generated successfully!</p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Leases
          </Link>

          {attachedRiders.length > 0 && (
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Riders included</h3>
              <ul className="space-y-1.5">
                {attachedRiders.map((id) => (
                  <li key={id} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {RIDER_LABELS[id] ?? id}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {skippedRiders.length > 0 && (
            <div className="border border-amber-300 bg-amber-50 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-amber-800">Some selected riders were not attached:</h3>
              </div>
              <ul className="space-y-1 ml-6">
                {skippedRiders.map(({ riderId, reason }) => (
                  <li key={riderId} className="text-sm text-amber-800">
                    <span className="font-medium">{RIDER_LABELS[riderId] ?? riderId}</span>
                    <span className="text-amber-600"> — {reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {attachedCustomRiders.length > 0 && (
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Custom riders included</h3>
              <ul className="space-y-1.5">
                {attachedCustomRiders.map((name) => (
                  <li key={name} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {skippedCustomRiders.length > 0 && (
            <div className="border border-amber-300 bg-amber-50 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-amber-800">Some custom riders were not attached:</h3>
              </div>
              <ul className="space-y-1 ml-6">
                {skippedCustomRiders.map(({ name, reason }) => (
                  <li key={name} className="text-sm text-amber-800">
                    <span className="font-medium">{name}</span>
                    <span className="text-amber-600"> — {reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4" /> Download PDF
          </a>

          <div className="border border-slate-200 rounded-lg overflow-hidden" style={{ height: '500px' }}>
            <iframe src={downloadUrl} className="w-full h-full" title="Lease Preview" />
          </div>

          {/* E-Signatures */}
          <div className="border-t border-slate-200 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">E-Signatures</h3>
              {signers && (
                <button
                  type="button"
                  onClick={handleRefreshStatus}
                  disabled={statusLoading}
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin' : ''}`} />
                  Refresh status
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Signing emails are in test mode and go to the office inbox until go-live.
            </p>

            {signingError && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>{signingError}</p>
              </div>
            )}

            {executed && (
              <div className="flex items-center gap-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">Executed.</p>
              </div>
            )}

            {!signers ? (
              <button
                type="button"
                onClick={handleInitSigning}
                disabled={initLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {initLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                ) : (
                  <><PenLine className="w-4 h-4" /> Send for signature</>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                {overallStatus && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500">Overall status:</span>
                    <StatusBadge status={overallStatus} />
                  </div>
                )}

                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {signers.map((s) => {
                    const key = `${s.role}-${s.index}`;
                    return (
                      <div key={key} className="flex items-center justify-between px-4 py-3 gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                          <p className="text-xs text-slate-500 capitalize">{s.role}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {s.status && <StatusBadge status={s.status} />}
                          {s.signUrl && (
                            <button
                              type="button"
                              onClick={() => copyLink(s.signUrl!, key)}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              {copiedToken === key ? 'Copied!' : 'Copy link'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {overallStatus === 'ready_to_countersign' && !executed && (
                  <button
                    type="button"
                    onClick={() => setShowCountersign(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                  >
                    <PenLine className="w-4 h-4" /> Counter-sign as Owner
                  </button>
                )}
              </div>
            )}

            {showCountersign && !executed && (
              <div className="border border-slate-200 rounded-lg p-4 space-y-4 bg-slate-50">
                <h4 className="text-sm font-semibold text-slate-900">Owner signature</h4>
                <SignaturePad ref={padRef} />
                {countersignError && (
                  <p className="text-sm text-red-600">{countersignError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCountersign}
                    disabled={countersigning}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {countersigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                    {countersigning ? 'Signing...' : 'Sign as Owner'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCountersign(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!leaseId || generating || saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
          ) : (
            <><FileText className="w-4 h-4" /> Generate Lease</>
          )}
        </button>
      )}
    </div>
  );
}
