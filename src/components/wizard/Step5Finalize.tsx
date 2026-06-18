import { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import { generateLease } from '@/data/supabase/generate';
import type { GenerateResult } from '@/data/supabase/generate';
import { updateLease } from '@/data/supabase/leases';
import { FileText, Download, Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle2 } from 'lucide-react';

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

export default function Step5Finalize() {
  const { leaseId, answers, flags, saving } = useWizard();
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError(`Please fill in: ${missing.join(', ')}`);
      return;
    }

    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      await updateLease(leaseId, { answers, flags });
      const r = await generateLease(leaseId);
      if (r.ok && r.downloadUrl) {
        setResult(r);
      } else {
        setError(r.error || 'Generation failed');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  const downloadUrl          = result?.downloadUrl          ?? null;
  const attachedRiders       = result?.attachedRiders       ?? [];
  const skippedRiders        = result?.skippedRiders        ?? [];
  const attachedCustomRiders = result?.attachedCustomRiders ?? [];
  const skippedCustomRiders  = result?.skippedCustomRiders  ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Step 5: Generate Lease</h2>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Summary</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-slate-500">Building</dt>
            <dd className="font-medium text-slate-900">{answers.BuildingName || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Unit</dt>
            <dd className="font-medium text-slate-900">{answers['Apt#'] || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Tenant</dt>
            <dd className="font-medium text-slate-900">{answers.TenantName || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Rent</dt>
            <dd className="font-medium text-slate-900">{answers.RentAmount ? `$${answers.RentAmount}` : '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Start</dt>
            <dd className="font-medium text-slate-900">{answers.LeaseStartDate || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">End</dt>
            <dd className="font-medium text-slate-900">{answers.LeaseEndDate || '—'}</dd>
          </div>
        </dl>

        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Active clauses:{' '}
            {Object.entries(flags)
              .filter(([, v]) => v)
              .map(([k]) => k)
              .join(', ') || 'None'}
          </p>
        </div>
      </div>

      {!leaseId && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Please complete previous steps and save progress first.
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {downloadUrl ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">Lease generated successfully!</p>
          </div>

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
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!leaseId || generating || saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" /> Generate Lease
            </>
          )}
        </button>
      )}
    </div>
  );
}
