import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { fetchLeases } from '@/data/supabase/leases';
import { generateLease, getLeaseArtifactUrl, type GenerateResult } from '@/data/supabase/generate';
import type { LeaseDocument } from '@/types';
import { Plus, FileText, Download, Loader as Loader2, RefreshCw, Pencil, TriangleAlert } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-amber-100 text-amber-800',
  generated: 'bg-green-100 text-green-800',
  signed:    'bg-blue-100 text-blue-800',
  void:      'bg-slate-100 text-slate-500',
};

function skippedSummary(result: GenerateResult): string | null {
  const parts: string[] = [];
  for (const s of result.skippedRiders ?? []) {
    parts.push(`${s.riderId}: ${s.reason}`);
  }
  for (const s of result.skippedCustomRiders ?? []) {
    parts.push(`"${s.name}": ${s.reason}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [leases, setLeases] = useState<LeaseDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [regenErrors, setRegenErrors] = useState<Record<string, string>>({});
  const [regenWarnings, setRegenWarnings] = useState<Record<string, string>>({});
  const [regenUrls, setRegenUrls] = useState<Record<string, string>>({});

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (!user) return;
    fetchLeases(user.id, isAdmin)
      .then(setLeases)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, isAdmin]);

  async function handleDownload(leaseId: string) {
    // Use fresh regen URL if available, otherwise fetch from storage
    const cached = regenUrls[leaseId];
    if (cached) { window.open(cached, '_blank'); return; }
    setDownloadingId(leaseId);
    try {
      const url = await getLeaseArtifactUrl(leaseId);
      if (url) window.open(url, '_blank');
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleRegenerate(lease: LeaseDocument) {
    setRegeneratingId(lease.id);
    setRegenErrors((prev) => { const n = { ...prev }; delete n[lease.id]; return n; });
    setRegenWarnings((prev) => { const n = { ...prev }; delete n[lease.id]; return n; });
    try {
      const result = await generateLease(lease.id);
      if (result.ok && result.downloadUrl) {
        // Update local list to show generated status
        setLeases((prev) =>
          prev.map((l) => l.id === lease.id ? { ...l, status: 'generated' } : l)
        );
        setRegenUrls((prev) => ({ ...prev, [lease.id]: result.downloadUrl! }));
        const warn = skippedSummary(result);
        if (warn) {
          setRegenWarnings((prev) => ({ ...prev, [lease.id]: warn }));
        }
        window.open(result.downloadUrl, '_blank');
      } else {
        const errMsg = result.error || 'Generation failed';
        const warn = skippedSummary(result);
        const full = warn ? `${errMsg} · Skipped: ${warn}` : errMsg;
        setRegenErrors((prev) => ({ ...prev, [lease.id]: full }));
      }
    } catch (err: unknown) {
      setRegenErrors((prev) => ({
        ...prev,
        [lease.id]: err instanceof Error ? err.message : 'Generation failed',
      }));
    } finally {
      setRegeneratingId(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Leases</h1>
        <Link
          to="/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Lease
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : leases.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No leases yet. Create your first one.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Building</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Unit</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leases.map((lease) => (
                <tr key={lease.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-900">
                    {lease.building || '—'}
                    {!lease.rent_roll_id && (
                      <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                        One-off
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-900">{lease.unit || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[lease.status] || ''}`}>
                      {lease.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(lease.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {/* Edit — loads wizard for any lease */}
                      <Link
                        to={`/lease/${lease.id}`}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </Link>

                      {/* Regenerate */}
                      <button
                        type="button"
                        onClick={() => handleRegenerate(lease)}
                        disabled={regeneratingId === lease.id}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                        title="Re-generate PDF from saved data"
                      >
                        {regeneratingId === lease.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        {regeneratingId === lease.id ? 'Generating…' : 'Regenerate'}
                      </button>

                      {/* PDF download */}
                      {(lease.status === 'generated' || regenUrls[lease.id]) && (
                        <button
                          type="button"
                          onClick={() => handleDownload(lease.id)}
                          disabled={downloadingId === lease.id}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          {downloadingId === lease.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          PDF
                        </button>
                      )}
                    </div>

                    {/* Per-row regeneration error */}
                    {regenErrors[lease.id] && (
                      <p className="flex items-start gap-1 text-xs text-red-600 mt-1.5 text-right justify-end">
                        <TriangleAlert className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{regenErrors[lease.id]}</span>
                      </p>
                    )}

                    {/* Skipped riders warning (generation succeeded but some riders dropped) */}
                    {regenWarnings[lease.id] && (
                      <p className="flex items-start gap-1 text-xs text-amber-600 mt-1.5 text-right justify-end">
                        <TriangleAlert className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>Skipped: {regenWarnings[lease.id]}</span>
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
