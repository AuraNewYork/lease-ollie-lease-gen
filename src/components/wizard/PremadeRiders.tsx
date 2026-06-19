import { useEffect, useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import { RIDER_CATALOG, type Rider, type RiderQuestion } from '@/riders/catalog';
import type { LeaseAnswers, LeaseFlags } from '@/types';
import { TriangleAlert as AlertTriangle, Shield, ChevronDown, ChevronRight } from 'lucide-react';

export default function PremadeRiders() {
  const { answers, flags, setAnswers, setFlags } = useWizard();

  // Seed mandatory rider IDs into selectedRiders and prefill creation dates — runs once on mount.
  useEffect(() => {
    const mandatoryIds = RIDER_CATALOG.filter((r) => r.mandatory).map((r) => r.id);
    const currentIds = answers.selectedRiders.split(',').filter(Boolean);
    const merged = [...new Set([...mandatoryIds, ...currentIds])];

    const dateUpdates: Partial<Record<keyof LeaseAnswers, string>> = {};
    for (const rider of RIDER_CATALOG) {
      for (const q of rider.questions) {
        if (
          q.kind === 'answer' &&
          q.prefill === 'creationDate' &&
          answers.LeaseCreationDate &&
          !(answers as unknown as Record<string, string>)[q.key]
        ) {
          dateUpdates[q.key as keyof LeaseAnswers] = answers.LeaseCreationDate;
        }
      }
    }

    const needsUpdate =
      merged.join(',') !== answers.selectedRiders || Object.keys(dateUpdates).length > 0;

    if (needsUpdate) {
      setAnswers({ ...answers, selectedRiders: merged.join(','), ...dateUpdates } as LeaseAnswers);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedIds: string[] = answers.selectedRiders.split(',').filter(Boolean);

  function setSelectedRiders(ids: string[]) {
    setAnswers({ ...answers, selectedRiders: ids.join(',') });
  }

  function isSelected(rider: Rider) {
    return rider.mandatory || selectedIds.includes(rider.id);
  }

  function toggleRider(rider: Rider) {
    if (rider.mandatory) return;
    if (selectedIds.includes(rider.id)) {
      setSelectedRiders(selectedIds.filter((id) => id !== rider.id));
    } else {
      setSelectedRiders([...selectedIds, rider.id]);
    }
  }

  function handleFlagChange(key: string, value: boolean, exclusiveGroup?: string, rider?: Rider) {
    const updated = { ...flags };
    if (exclusiveGroup && rider) {
      for (const q of rider.questions) {
        if (q.kind === 'flag' && q.exclusiveGroup === exclusiveGroup) {
          (updated as Record<string, boolean>)[q.key] = false;
        }
      }
    }
    (updated as Record<string, boolean>)[key] = value;
    setFlags(updated as LeaseFlags);
  }

  function handleAnswerChange(key: string, value: string) {
    setAnswers({ ...answers, [key]: value } as LeaseAnswers);
  }

  // Compute soft warnings: selected riders with unanswered required fields.
  const warnings = computeWarnings(selectedIds, answers, flags);

  const enRiders = RIDER_CATALOG.filter((r) => r.language === 'EN');
  const esRiders = RIDER_CATALOG.filter((r) => r.language === 'ES');

  return (
    <div className="space-y-6">
      {warnings.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg px-4 py-3 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-semibold">Required rider fields incomplete (generation will still work)</span>
          </div>
          <ul className="space-y-0.5 pl-6">
            {warnings.map(({ label, issues }) => (
              <li key={label} className="text-xs text-amber-700">
                <span className="font-medium">{label}:</span>{' '}
                {issues.join('; ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {flags.builtBefore1978 && !selectedIds.includes('federalLead') && (
        <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3">
          <span>Pre-1978 building: the Federal Lead-Based Paint Disclosure is usually required. Select it under Optional Riders below.</span>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Required NYC Disclosures</h3>
        <div className="space-y-2">
          {enRiders.filter((r) => r.mandatory).map((rider) => (
            <RiderCard
              key={rider.id}
              rider={rider}
              selected={true}
              onToggle={() => {}}
              answers={answers}
              flags={flags}
              onFlagChange={handleFlagChange}
              onAnswerChange={handleAnswerChange}
            />
          ))}
        </div>
      </div>

      {enRiders.some((r) => !r.mandatory) && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Optional Riders (English)</h3>
          <div className="space-y-2">
            {enRiders.filter((r) => !r.mandatory).map((rider) => (
              <RiderCard
                key={rider.id}
                rider={rider}
                selected={isSelected(rider)}
                onToggle={() => toggleRider(rider)}
                answers={answers}
                flags={flags}
                onFlagChange={handleFlagChange}
                onAnswerChange={handleAnswerChange}
              />
            ))}
          </div>
        </div>
      )}

      {esRiders.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Spanish Translations</h3>
          <p className="text-xs text-slate-500 mb-2">
            These use the same data as the English versions; selecting adds the Spanish template to the lease package.
          </p>
          <div className="space-y-2">
            {esRiders.map((rider) => (
              <RiderCard
                key={rider.id}
                rider={rider}
                selected={isSelected(rider)}
                onToggle={() => toggleRider(rider)}
                answers={answers}
                flags={flags}
                onFlagChange={handleFlagChange}
                onAnswerChange={handleAnswerChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Required-field warning computation ───────────────────────────────────────

const OPTIONAL_ANSWER_KEYS = new Set(['wg_DeadlineDate', 'knob_returnByDate']);

// Keys that are only required when their trigger flag is true.
const TRIGGER_REQUIRED: Record<string, string> = {
  bb_buildingEradicatedFloors:    'bb_buildingEradicated',
  bb_buildingNotEradicatedFloors: 'bb_buildingNotEradicated',
  bb_otherText:                   'bb_other',
  smk_otherText:                  'smk_other',
  spr_lastInspectDate:            'spr_hasSystem',
};

function isAnswerRequired(key: string, flags: LeaseFlags): boolean {
  if (key.endsWith('SignDate')) return false;
  if (OPTIONAL_ANSWER_KEYS.has(key)) return false;
  const trigger = TRIGGER_REQUIRED[key];
  if (trigger !== undefined) {
    return (flags as unknown as Record<string, boolean>)[trigger] ?? false;
  }
  return true;
}

function computeWarnings(
  selectedIds: string[],
  answers: LeaseAnswers,
  flags: LeaseFlags,
): Array<{ label: string; issues: string[] }> {
  const result: Array<{ label: string; issues: string[] }> = [];

  for (const rider of RIDER_CATALOG) {
    if (!selectedIds.includes(rider.id)) continue;

    const issues: string[] = [];
    const seenGroups = new Set<string>();

    for (const q of rider.questions) {
      if (q.kind === 'answer' && isAnswerRequired(q.key, flags)) {
        const val = (answers as unknown as Record<string, string>)[q.key] ?? '';
        if (!val) issues.push(`"${q.label}" is blank`);
      }
      if (q.kind === 'flag' && q.exclusiveGroup && !seenGroups.has(q.exclusiveGroup)) {
        seenGroups.add(q.exclusiveGroup);
        const anyChosen = rider.questions.some(
          (fq) =>
            fq.kind === 'flag' &&
            fq.exclusiveGroup === q.exclusiveGroup &&
            ((flags as unknown as Record<string, boolean>)[fq.key] ?? false),
        );
        if (!anyChosen) {
          issues.push(`choose one for "${q.exclusiveGroup.replace(/_/g, ' ')}"`);
        }
      }
    }

    if (issues.length > 0) {
      result.push({ label: rider.label, issues });
    }
  }

  return result;
}

// ─── RiderCard ────────────────────────────────────────────────────────────────

interface RiderCardProps {
  rider: Rider;
  selected: boolean;
  onToggle: () => void;
  answers: LeaseAnswers;
  flags: LeaseFlags;
  onFlagChange: (key: string, value: boolean, exclusiveGroup?: string, rider?: Rider) => void;
  onAnswerChange: (key: string, value: string) => void;
}

function RiderCard({ rider, selected, onToggle, answers, flags, onFlagChange, onAnswerChange }: RiderCardProps) {
  // Mandatory riders start expanded so required fields are immediately visible.
  const [expanded, setExpanded] = useState(rider.mandatory);
  const hasQuestions = rider.questions.length > 0;

  return (
    <div className={`border rounded-lg transition-colors ${selected ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          disabled={rider.mandatory}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
        />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-slate-900">{rider.label}</span>
          {rider.mandatory && (
            <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100 rounded">
              <Shield className="w-3 h-3" /> Required
            </span>
          )}
        </div>
        {hasQuestions && selected && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
      </div>

      {hasQuestions && selected && expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100">
          <RiderQuestions
            rider={rider}
            answers={answers}
            flags={flags}
            onFlagChange={onFlagChange}
            onAnswerChange={onAnswerChange}
          />
        </div>
      )}
    </div>
  );
}

// ─── RiderQuestions ───────────────────────────────────────────────────────────

interface RiderQuestionsProps {
  rider: Rider;
  answers: LeaseAnswers;
  flags: LeaseFlags;
  onFlagChange: (key: string, value: boolean, exclusiveGroup?: string, rider?: Rider) => void;
  onAnswerChange: (key: string, value: string) => void;
}

function RiderQuestions({ rider, answers, flags, onFlagChange, onAnswerChange }: RiderQuestionsProps) {
  const groups = new Map<string, RiderQuestion[]>();
  const standalone: RiderQuestion[] = [];

  for (const q of rider.questions) {
    if (q.kind === 'flag' && q.exclusiveGroup) {
      const list = groups.get(q.exclusiveGroup) || [];
      list.push(q);
      groups.set(q.exclusiveGroup, list);
    } else {
      standalone.push(q);
    }
  }

  // A group is required (no option chosen yet) for the indicator.
  function groupHasNoSelection(groupQuestions: RiderQuestion[]): boolean {
    return !groupQuestions.some(
      (q) => q.kind === 'flag' && ((flags as unknown as Record<string, boolean>)[q.key] ?? false),
    );
  }

  return (
    <div className="space-y-4 mt-2">
      {Array.from(groups.entries()).map(([groupName, questions]) => {
        const needsSelection = groupHasNoSelection(questions);
        return (
          <fieldset key={groupName} className="space-y-1.5">
            <legend className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              {groupName.replace(/_/g, ' ')}
              {needsSelection && (
                <span className="ml-1.5 text-[10px] font-semibold text-red-500 normal-case">* required</span>
              )}
            </legend>
            {questions.map((q) => {
              if (q.kind !== 'flag') return null;
              const checked = (flags as unknown as Record<string, boolean>)[q.key] ?? false;
              return (
                <label key={q.key} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`${rider.id}_${groupName}`}
                    checked={checked}
                    onChange={() => onFlagChange(q.key, true, q.exclusiveGroup, rider)}
                    className="mt-0.5 w-4 h-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">{q.label}</span>
                </label>
              );
            })}
          </fieldset>
        );
      })}

      {standalone.map((q) => {
        if (q.kind === 'flag') {
          const checked = (flags as unknown as Record<string, boolean>)[q.key] ?? false;
          return (
            <label key={q.key} className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onFlagChange(q.key, e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{q.label}</span>
            </label>
          );
        }
        if (q.kind === 'answer') {
          const value = (answers as unknown as Record<string, string>)[q.key] ?? '';
          const isRequired = isAnswerRequired(q.key, flags);
          const isEmpty = !value;
          return (
            <div key={q.key}>
              <label className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1">
                {q.label}
                {isRequired && (
                  <span className={`text-[10px] font-semibold ${isEmpty ? 'text-red-500' : 'text-slate-400'}`}>
                    * required
                  </span>
                )}
              </label>
              <input
                type={q.type === 'date' ? 'date' : 'text'}
                value={value}
                onChange={(e) => onAnswerChange(q.key, e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isRequired && isEmpty
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-300'
                }`}
              />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
