import { useState, useEffect, useRef, useCallback } from 'react';
import { useWizard } from '@/context/WizardContext';
import { useAuth } from '@/context/AuthContext';
import {
  listPresets, createPreset, updatePreset, deletePreset,
} from '@/data/supabase/presets';
import type { LeaseGenPreset, PresetScope, LeaseAnswers, LeaseFlags } from '@/types';
import { DEFAULT_ANSWERS, DEFAULT_FLAGS } from '@/types';
import { Bookmark, ChevronDown, Loader as Loader2, Pencil, Trash2, RotateCw, X, Check } from 'lucide-react';

interface Props {
  scope: PresetScope;
  /** For scope='full' pass [] — the bar will use all answers+flags automatically. */
  answerKeys: (keyof LeaseAnswers)[];
  flagKeys: (keyof LeaseFlags)[];
}

type Panel = 'none' | 'apply' | 'save' | 'manage';

export default function PresetBar({ scope, answerKeys, flagKeys }: Props) {
  const { user } = useAuth();
  const { answers, flags, setAnswers, setFlags, landlordId } = useWizard();

  const [presets, setPresets] = useState<LeaseGenPreset[]>([]);
  const [panel, setPanel] = useState<Panel>('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save panel state
  const [saveName, setSaveName] = useState('');
  const [saveForLandlord, setSaveForLandlord] = useState(!!landlordId);
  const [saving, setSaving] = useState(false);

  // Manage: rename state per preset
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Confirm overwrite state
  const [confirmPreset, setConfirmPreset] = useState<LeaseGenPreset | null>(null);
  const [filledCount, setFilledCount] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  const scopeLabel: Record<PresetScope, string> = {
    full: 'Full Document',
    lease: 'Lease & Property',
    participants: 'Participants',
    clauses: 'Clauses',
    riders: 'Riders',
  };

  const loadPresets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listPresets(scope, landlordId);
      setPresets(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load presets');
    } finally {
      setLoading(false);
    }
  }, [scope, landlordId, user]);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  // Close panels on outside click
  useEffect(() => {
    if (panel === 'none' && !confirmPreset) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPanel('none');
        setConfirmPreset(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [panel, confirmPreset]);

  function countFilled(): number {
    if (scope === 'full') {
      let n = 0;
      for (const k of Object.keys(DEFAULT_ANSWERS) as (keyof LeaseAnswers)[]) {
        if (answers[k] !== DEFAULT_ANSWERS[k]) n++;
      }
      for (const k of Object.keys(DEFAULT_FLAGS) as (keyof LeaseFlags)[]) {
        if (flags[k] !== DEFAULT_FLAGS[k]) n++;
      }
      return n;
    }
    let n = 0;
    for (const k of answerKeys) {
      if (answers[k] !== DEFAULT_ANSWERS[k]) n++;
    }
    for (const k of flagKeys) {
      if (flags[k] !== DEFAULT_FLAGS[k]) n++;
    }
    return n;
  }

  function doApply(preset: LeaseGenPreset) {
    if (scope === 'full') {
      setAnswers({ ...answers, ...(preset.answers as Partial<LeaseAnswers>) });
      setFlags({ ...flags, ...(preset.flags as Partial<LeaseFlags>) });
    } else {
      const newAnswers = { ...answers };
      for (const k of answerKeys) {
        const v = (preset.answers as Record<string, string>)[k as string];
        if (v !== undefined) (newAnswers as Record<string, string>)[k as string] = v;
      }
      const newFlags = { ...flags };
      for (const k of flagKeys) {
        const v = (preset.flags as Record<string, boolean>)[k as string];
        if (v !== undefined) (newFlags as Record<string, boolean>)[k as string] = v;
      }
      setAnswers(newAnswers);
      setFlags(newFlags);
    }
    setPanel('none');
    setConfirmPreset(null);
  }

  function handleApplyClick(preset: LeaseGenPreset) {
    const filled = countFilled();
    if (filled === 0) {
      doApply(preset);
    } else {
      setFilledCount(filled);
      setConfirmPreset(preset);
      setPanel('none');
    }
  }

  function extractScopedData(): { answers: Record<string, string>; flags: Record<string, boolean> } {
    if (scope === 'full') {
      return {
        answers: { ...(answers as unknown as Record<string, string>) },
        flags: { ...(flags as unknown as Record<string, boolean>) },
      };
    }
    const a: Record<string, string> = {};
    for (const k of answerKeys) {
      a[k as string] = (answers as unknown as Record<string, string>)[k as string] ?? '';
    }
    const f: Record<string, boolean> = {};
    for (const k of flagKeys) {
      f[k as string] = (flags as unknown as Record<string, boolean>)[k as string] ?? false;
    }
    return { answers: a, flags: f };
  }

  async function handleSave() {
    if (!saveName.trim() || !user) return;
    setSaving(true);
    setError(null);
    try {
      const { answers: a, flags: f } = extractScopedData();
      await createPreset({
        name: saveName.trim(),
        scope,
        landlord_id: saveForLandlord ? landlordId : null,
        answers: a,
        flags: f,
        created_by: user.id,
      });
      setSaveName('');
      setPanel('none');
      await loadPresets();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save preset');
    } finally {
      setSaving(false);
    }
  }

  async function handleOverwrite(preset: LeaseGenPreset) {
    setError(null);
    try {
      const { answers: a, flags: f } = extractScopedData();
      await updatePreset(preset.id, { answers: a, flags: f });
      await loadPresets();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to overwrite preset');
    }
  }

  async function handleRename(id: string) {
    if (!renameValue.trim()) return;
    setError(null);
    try {
      await updatePreset(id, { name: renameValue.trim() });
      setRenamingId(null);
      setRenameValue('');
      await loadPresets();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to rename');
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deletePreset(id);
      setDeletingId(null);
      await loadPresets();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete preset');
    }
  }

  function togglePanel(p: Panel) {
    setPanel((cur) => (cur === p ? 'none' : p));
    if (p === 'save') setSaveForLandlord(!!landlordId);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Main bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
        <Bookmark className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span className="text-xs font-medium text-slate-500 mr-1">
          {scope === 'full' ? 'Full-doc preset' : `${scopeLabel[scope]} preset`}
        </span>

        {/* Apply dropdown trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => togglePanel('apply')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:border-slate-400 transition-colors"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Apply
            <ChevronDown className="w-3 h-3" />
          </button>

          {panel === 'apply' && (
            <div className="absolute left-0 top-full mt-1 z-30 min-w-[220px] bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
              {presets.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-slate-400">
                  No presets saved for this section yet.
                </p>
              ) : (
                <ul>
                  {presets.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                    >
                      <span className="text-xs text-slate-800 truncate flex-1 min-w-0 pr-2">
                        {p.name}
                        {p.landlord_id && (
                          <span className="ml-1.5 text-[10px] text-slate-400">(landlord)</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplyClick(p)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 flex-shrink-0"
                      >
                        Apply
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Save as preset */}
        <button
          type="button"
          onClick={() => togglePanel('save')}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:border-slate-400 transition-colors"
        >
          Save as preset
        </button>

        {/* Manage */}
        {presets.length > 0 && (
          <button
            type="button"
            onClick={() => togglePanel('manage')}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Manage
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="mt-1 text-xs text-red-600 px-1">{error}</p>
      )}

      {/* Save panel */}
      {panel === 'save' && (
        <div className="mt-1 p-3 bg-white border border-slate-200 rounded-lg shadow-sm space-y-2">
          <p className="text-xs font-medium text-slate-600">Save current {scopeLabel[scope]} values as a preset:</p>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setPanel('none'); }}
              placeholder="Preset name"
              className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !saveName.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Save
            </button>
            <button
              type="button"
              onClick={() => setPanel('none')}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {landlordId && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={saveForLandlord}
                onChange={(e) => setSaveForLandlord(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600"
              />
              <span className="text-xs text-slate-600">For this landlord only</span>
            </label>
          )}
        </div>
      )}

      {/* Manage panel */}
      {panel === 'manage' && (
        <div className="mt-1 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Manage presets</span>
            <button type="button" onClick={() => setPanel('none')} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {presets.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">No presets yet.</p>
          ) : (
            <ul>
              {presets.map((p) => (
                <li key={p.id} className="px-3 py-2 border-b border-slate-50 last:border-0">
                  {renamingId === p.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRename(p.id); if (e.key === 'Escape') setRenamingId(null); }}
                        className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button type="button" onClick={() => handleRename(p.id)} className="p-1 text-green-600 hover:text-green-800">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setRenamingId(null)} className="p-1 text-slate-400 hover:text-slate-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : deletingId === p.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 flex-1">Delete "{p.name}"?</span>
                      <button type="button" onClick={() => handleDelete(p.id)} className="text-xs font-medium text-red-600 hover:text-red-800">Confirm</button>
                      <button type="button" onClick={() => setDeletingId(null)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-800 flex-1 truncate">
                        {p.name}
                        {p.landlord_id && <span className="ml-1.5 text-[10px] text-slate-400">(landlord)</span>}
                      </span>
                      <button
                        type="button"
                        title="Overwrite with current values"
                        onClick={() => handleOverwrite(p)}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Rename"
                        onClick={() => { setRenamingId(p.id); setRenameValue(p.name); }}
                        className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => setDeletingId(p.id)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Confirm overwrite dialog */}
      {confirmPreset && (
        <div className="mt-1 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
          <p className="text-xs text-amber-800 font-medium">
            Replace {filledCount} filled field{filledCount !== 1 ? 's' : ''} in this section with "{confirmPreset.name}"?
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => doApply(confirmPreset)}
              className="px-3 py-1.5 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700 transition-colors"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => setConfirmPreset(null)}
              className="px-3 py-1.5 text-xs text-amber-700 hover:text-amber-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
