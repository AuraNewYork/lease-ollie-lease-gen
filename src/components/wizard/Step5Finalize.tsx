import { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import { generateLease } from '@/data/supabase/generate';
import { updateLease } from '@/data/supabase/leases';
import { FileText, Download, Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle2 } from 'lucide-react';

export default function Step5Finalize() {
  const { leaseId, answers, flags, saving } = useWizard();
  const [generating, setGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!leaseId) return;
    setGenerating(true);
    setError(null);
    setDownloadUrl(null);
    try {
      await updateLease(leaseId, { answers, flags });
      const result = await generateLease(leaseId);
      if (result.ok && result.downloadUrl) {
        setDownloadUrl(result.downloadUrl);
      } else {
        setError(result.error || 'Generation failed');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

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
            <CheckCircle2 className="w-5 h-5" />
            <p className="text-sm font-medium">Lease generated successfully!</p>
          </div>

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
