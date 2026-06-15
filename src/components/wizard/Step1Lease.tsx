import { useState, useEffect } from 'react';
import { useWizard } from '@/context/WizardContext';
import { fetchBuildings, fetchUnitByBuilding } from '@/data/supabase/units';
import type { BuildingConfig } from '@/types';
import FormField from '@/components/ui/FormField';
import { Search, Building2, PenLine } from 'lucide-react';

export default function Step1Lease() {
  const {
    answers, updateAnswer, mode, setMode,
    building, setBuilding, setLandlordId, setRentRollId,
  } = useWizard();
  const [buildings, setBuildings] = useState<BuildingConfig[]>([]);
  const [unitInput, setUnitInput] = useState(answers['Apt#']);
  const [lookupStatus, setLookupStatus] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'existing') {
      fetchBuildings().then(setBuildings).catch(() => {});
    }
  }, [mode]);

  function handleModeSwitch(m: 'existing' | 'manual') {
    setMode(m);
    if (m === 'manual') {
      setBuilding(null);
      setLandlordId(null);
      setRentRollId(null);
    }
    setLookupStatus(null);
  }

  async function handleBuildingSelect(id: string) {
    const b = buildings.find((x) => x.id === id) ?? null;
    setBuilding(b);
    if (b) {
      updateAnswer('BuildingName', b.display_name);
      updateAnswer('Address', `${b.address}${b.city_state_zip ? ', ' + b.city_state_zip : ''}`);
      updateAnswer('OwnerName', b.entity || '');
      updateAnswer('OwnerAddress', `${b.address}${b.city_state_zip ? ', ' + b.city_state_zip : ''}`);
      setLandlordId(b.landlord_id);
    }
  }

  async function handleUnitLookup() {
    if (!building || !unitInput.trim()) return;
    setLookupStatus('Looking up...');
    try {
      const unit = await fetchUnitByBuilding(building, unitInput.trim());
      if (unit) {
        updateAnswer('Apt#', unit.unit);
        setUnitInput(unit.unit);
        updateAnswer('Address', unit.address || unit.short_address || answers.Address);
        updateAnswer('RentAmount', unit.gross ? String(unit.gross) : '');
        const tenants = [unit.tt1_name, unit.tt2_name, unit.tt3_name, unit.tt4_name]
          .filter(Boolean)
          .join(', ');
        updateAnswer('TenantName', tenants);
        updateAnswer('TenantEmail', unit.tt1_email || '');
        const occupants = [unit.occupant_1_name, unit.occupant_2_name].filter(Boolean).join(', ');
        updateAnswer('Occupants', occupants);
        setRentRollId(unit.id);
        if (unit.landlord_id) setLandlordId(unit.landlord_id);
        setLookupStatus('Autofilled from rent roll');
      } else {
        updateAnswer('Apt#', unitInput.trim());
        setLookupStatus('No rent roll entry found — enter manually');
      }
    } catch {
      setLookupStatus('Lookup failed');
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Step 1: Lease & Property</h2>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleModeSwitch('existing')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
            mode === 'existing'
              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Existing Building
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch('manual')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
            mode === 'manual'
              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          <PenLine className="w-4 h-4" />
          Manual / One-off
        </button>
      </div>

      {mode === 'existing' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-blue-800">Autofill from Building & Unit</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Building</label>
              <select
                value={building?.id ?? ''}
                onChange={(e) => handleBuildingSelect(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select building...</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.display_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
              <div className="flex gap-2">
                <input
                  value={unitInput}
                  onChange={(e) => setUnitInput(e.target.value)}
                  placeholder="e.g. 4A"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleUnitLookup}
                  disabled={!building}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          {lookupStatus && <p className="text-xs text-blue-700">{lookupStatus}</p>}
        </div>
      )}

      {mode === 'manual' && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm text-slate-600">
            Enter all property details manually. No building or rent roll lookup required.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField
          label="Lease Creation Date"
          type="date"
          value={answers.LeaseCreationDate}
          onChange={(v) => updateAnswer('LeaseCreationDate', v)}
        />
        <FormField
          label="Lease Start Date"
          type="date"
          value={answers.LeaseStartDate}
          onChange={(v) => updateAnswer('LeaseStartDate', v)}
        />
        <FormField
          label="Lease End Date"
          type="date"
          value={answers.LeaseEndDate}
          onChange={(v) => updateAnswer('LeaseEndDate', v)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Building Name"
          value={answers.BuildingName}
          onChange={(v) => updateAnswer('BuildingName', v)}
        />
        <FormField
          label="Address"
          value={answers.Address}
          onChange={(v) => updateAnswer('Address', v)}
          placeholder={mode === 'manual' ? 'Full address (street, city, state, zip)' : undefined}
        />
        <FormField
          label="Apt #"
          value={answers['Apt#']}
          onChange={(v) => updateAnswer('Apt#', v)}
        />
        <FormField
          label="Floor"
          value={answers.AptFlr}
          onChange={(v) => updateAnswer('AptFlr', v)}
        />
      </div>

      <FormField
        label="Utilities Included"
        value={answers.UtilitiesIncluded}
        onChange={(v) => updateAnswer('UtilitiesIncluded', v)}
        placeholder="e.g. Heat, Hot Water"
      />
    </div>
  );
}
