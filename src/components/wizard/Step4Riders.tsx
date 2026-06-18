import { useState, useEffect } from 'react';
import { useWizard } from '@/context/WizardContext';
import { fetchRiders, createRider, deleteRider, fetchLeaseRiderLinks, attachRiderToLease, detachRiderFromLease } from '@/data/supabase/riders';
import { useAuth } from '@/context/AuthContext';
import type { CustomRider, LeaseRiderLink } from '@/types';
import { Plus, Trash2, Link2, Unlink, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import PremadeRiders from './PremadeRiders';

const AI_PROMPT = `You are drafting a custom lease rider that will be attached to a NYC residential lease (REBNY standard
form). Output ONLY clean semantic HTML for the rider body — no <html>, <head>, or <body> wrapper, no
CSS, no markdown. Use <h2> for the rider title, <p> for paragraphs, <strong> for emphasis, and
<ol>/<ul> with <li> for lists.

The lease generator will automatically fill these merge tags wherever you place them — type them
exactly, including the double braces:
- Parties & property: {{TenantName}}, {{TenantEmail}}, {{Occupants}}, {{OwnerName}}, {{OwnerAddress}},
  {{OwnerEmail}}, {{BuildingName}}, {{Address}}, {{Apt#}}, {{AptFlr}}
- Money & dates: {{RentAmount}}, {{SecurityDeposit}}, {{LeaseStartDate}}, {{LeaseEndDate}},
  {{LeaseCreationDate}}   (money prints as a number — the lease already shows the $; dates are MM/DD/YYYY)
Do NOT place a date on any signature line — leave signature/date lines blank (they are signed by hand).
Do not invent values for tags that are not in the list above.

Write the rider to cover the following:
================  DESCRIBE THE RIDER HERE (replace everything between the brackets)  ================
[[  Example: "Pet Rider — Tenant may keep one cat under 20 lbs. Tenant pays a $500 refundable pet
    deposit and is liable for any pet-related damage. Owner may revoke this permission on 30 days
    written notice if the pet becomes a nuisance."  Replace this with exactly what THIS rider says. ]]
===================================================================================================

Return only the rider HTML.`;

export default function Step4Riders() {
  const { user } = useAuth();
  const { leaseId, landlordId } = useWizard();
  const [riders, setRiders] = useState<CustomRider[]>([]);
  const [links, setLinks] = useState<LeaseRiderLink[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBody, setNewBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveLandlordId = landlordId || user?.landlord_id || null;

  useEffect(() => {
    loadData();
  }, [effectiveLandlordId, leaseId]);

  async function loadData() {
    setLoading(true);
    try {
      const r = await fetchRiders(effectiveLandlordId);
      setRiders(r);
      if (leaseId) {
        const l = await fetchLeaseRiderLinks(leaseId);
        setLinks(l);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load riders');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !user) return;
    try {
      await createRider({
        landlord_id: effectiveLandlordId,
        name: newName.trim(),
        body_html: newBody,
        created_by: user.id,
      });
      setNewName('');
      setNewBody('');
      setShowCreate(false);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create rider');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteRider(id);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete rider');
    }
  }

  async function handleAttach(riderId: string) {
    if (!leaseId) return;
    const maxOrder = links.reduce((max, l) => Math.max(max, l.sort_order), 0);
    try {
      await attachRiderToLease(leaseId, riderId, maxOrder + 1);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to attach rider');
    }
  }

  async function handleDetach(riderId: string) {
    if (!leaseId) return;
    try {
      await detachRiderFromLease(leaseId, riderId);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to detach rider');
    }
  }

  function isAttached(riderId: string) {
    return links.some((l) => l.custom_rider_id === riderId);
  }

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the pre element text
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Step 4: Riders</h2>
        <p className="text-sm text-slate-500 mt-1">
          Select premade NYC disclosure riders and fill in their details, then optionally attach custom riders.
        </p>
      </div>

      <PremadeRiders />

      <div className="border-t border-slate-200 pt-6 space-y-4">
        <h3 className="text-base font-semibold text-slate-900">Custom Riders</h3>
        <p className="text-sm text-slate-500">
          {effectiveLandlordId
            ? 'Manage custom riders for this landlord. Attach riders to include them with this lease.'
            : 'Manage general-purpose riders (no landlord linked). Attach riders to include them with this lease.'}
        </p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        {!leaseId && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Save progress (click Next on earlier steps) before attaching riders.
          </p>
        )}

        {/* AI drafting helper */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAIPrompt(!showAIPrompt)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Sparkles className="w-4 h-4 text-blue-500" />
              Draft a rider with AI
            </span>
            {showAIPrompt ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showAIPrompt && (
            <div className="px-4 pb-4 pt-3 space-y-3 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Fill in the bracketed part below with what this rider should say, copy the whole prompt into Claude/ChatGPT, then paste the HTML it returns into the rider body.
              </p>
              <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 whitespace-pre-wrap overflow-auto max-h-64 select-all text-slate-700">
                {AI_PROMPT}
              </pre>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy prompt'}
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          {showCreate ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showCreate ? 'Cancel' : 'Create New Rider'}
        </button>

        {showCreate && (
          <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
            <p className="text-xs text-slate-500">
              Paste HTML. Use merge tags like <code className="bg-slate-100 px-1 rounded">{'{{TenantName}}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{{Address}}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{{RentAmount}}'}</code> — the generator fills them automatically.
            </p>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Rider name"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Rider body (HTML). Use {{TenantName}}, {{Address}}, etc. for merge fields."
              rows={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Rider
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading riders...</p>
        ) : riders.length === 0 ? (
          <p className="text-sm text-slate-500">No custom riders yet. Create one above.</p>
        ) : (
          <div className="space-y-2">
            {riders.map((rider) => (
              <div
                key={rider.id}
                className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                  isAttached(rider.id) ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{rider.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {rider.body_html.replace(/<[^>]*>/g, '').slice(0, 80)}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {leaseId && (
                    <button
                      type="button"
                      onClick={() => (isAttached(rider.id) ? handleDetach(rider.id) : handleAttach(rider.id))}
                      className={`p-1.5 rounded transition-colors ${
                        isAttached(rider.id)
                          ? 'text-blue-600 hover:bg-blue-100'
                          : 'text-slate-400 hover:bg-slate-100'
                      }`}
                      title={isAttached(rider.id) ? 'Detach' : 'Attach'}
                    >
                      {isAttached(rider.id) ? <Unlink className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(rider.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Deactivate"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
