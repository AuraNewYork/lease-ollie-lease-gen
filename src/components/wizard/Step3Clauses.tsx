import { useWizard } from '@/context/WizardContext';
import FormField from '@/components/ui/FormField';
import Toggle from '@/components/ui/Toggle';

export default function Step3Clauses() {
  const { answers, updateAnswer, flags, toggleFlag } = useWizard();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Step 3: Optional Clauses</h2>
      <p className="text-sm text-slate-500">Toggle clauses on/off. Fill in details for active clauses.</p>

      <div className="space-y-5">
        <div className="p-4 bg-slate-50 rounded-lg">
          <Toggle label="Include Guaranty" checked={flags.guarantyIncluded} onChange={() => toggleFlag('guarantyIncluded')} />
        </div>

        <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
          <Toggle label="Furniture Included" checked={flags.furnitureIncluded} onChange={() => toggleFlag('furnitureIncluded')} />
          {flags.furnitureIncluded && (
            <FormField label="Furniture Description" value={answers.Furniture} onChange={(v) => updateAnswer('Furniture', v)} placeholder="List furniture included" />
          )}
        </div>

        <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
          <Toggle label="Owner Work / Improvements" checked={flags.ownerWork} onChange={() => toggleFlag('ownerWork')} />
          {flags.ownerWork && (
            <FormField label="Owner Work Description" value={answers.OwnershipWork} onChange={(v) => updateAnswer('OwnershipWork', v)} />
          )}
        </div>

        <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
          <Toggle label="Approved Alterations" checked={flags.approvedAlterations} onChange={() => toggleFlag('approvedAlterations')} />
          {flags.approvedAlterations && (
            <FormField label="Alterations Description" value={answers.ApprovedAlterations} onChange={(v) => updateAnswer('ApprovedAlterations', v)} />
          )}
        </div>

        <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
          <Toggle label="Sub-Metered Utilities" checked={flags.subMetered} onChange={() => toggleFlag('subMetered')} />
          {flags.subMetered && (
            <FormField label="Sub-Metered Utilities" value={answers.SubMeteredUtilities} onChange={(v) => updateAnswer('SubMeteredUtilities', v)} />
          )}
        </div>

        <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
          <Toggle label="Tenant Appliance Repair" checked={flags.applianceRepair} onChange={() => toggleFlag('applianceRepair')} />
          {flags.applianceRepair && (
            <FormField label="Max Repair Cost" value={answers.TTApplianceRepairCost} onChange={(v) => updateAnswer('TTApplianceRepairCost', v)} placeholder="e.g. 150" />
          )}
        </div>

        <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
          <Toggle label="General Liability Insurance Required" checked={flags.glInsurance} onChange={() => toggleFlag('glInsurance')} />
          {flags.glInsurance && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Min Insurance ($)" value={answers.MinInsuranceNum} onChange={(v) => updateAnswer('MinInsuranceNum', v)} />
              <FormField label="Min Insurance (text)" value={answers.MinInsuranceTxt} onChange={(v) => updateAnswer('MinInsuranceTxt', v)} />
              <FormField label="Max Insurance ($)" value={answers.MaxInsuranceNum} onChange={(v) => updateAnswer('MaxInsuranceNum', v)} />
              <FormField label="Max Insurance (text)" value={answers.MaxInsuranceTxt} onChange={(v) => updateAnswer('MaxInsuranceTxt', v)} />
            </div>
          )}
        </div>

        <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
          <Toggle label="Lease Extension Option" checked={flags.extension} onChange={() => toggleFlag('extension')} />
          {flags.extension && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Extension Years" value={answers.ExtensionYears} onChange={(v) => updateAnswer('ExtensionYears', v)} />
              <FormField label="Extension Rent" value={answers.ExtensionRent} onChange={(v) => updateAnswer('ExtensionRent', v)} />
              <FormField label="Extension Start" type="date" value={answers.ExtensionStartDate} onChange={(v) => updateAnswer('ExtensionStartDate', v)} />
              <FormField label="Extension End" type="date" value={answers.ExtensionEndDate} onChange={(v) => updateAnswer('ExtensionEndDate', v)} />
            </div>
          )}
        </div>

        <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
          <Toggle label="Pets Allowed" checked={flags.petsAllowed} onChange={() => toggleFlag('petsAllowed')} />
          {flags.petsAllowed && (
            <FormField label="Pet Types" value={answers.PetTypes} onChange={(v) => updateAnswer('PetTypes', v)} placeholder="e.g. 1 dog, max 25 lbs" />
          )}
        </div>

        <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
          <Toggle label="Brokers Retained" checked={flags.brokersRetained} onChange={() => toggleFlag('brokersRetained')} />
          {flags.brokersRetained && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Owner's Broker" value={answers.OwnersBroker} onChange={(v) => updateAnswer('OwnersBroker', v)} />
              <FormField label="Tenant's Broker" value={answers.TenantsBroker} onChange={(v) => updateAnswer('TenantsBroker', v)} />
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 rounded-lg">
          <Toggle label="Has Outdoor Space" checked={flags.hasOutdoorSpace} onChange={() => toggleFlag('hasOutdoorSpace')} />
        </div>

        <div className="p-4 bg-slate-50 rounded-lg">
          <Toggle label="Built Before 1978 (Lead Paint)" checked={flags.builtBefore1978} onChange={() => toggleFlag('builtBefore1978')} />
        </div>

        <div className="p-4 bg-slate-50 rounded-lg">
          <Toggle label="Has Alarm System" checked={flags.hasAlarm} onChange={() => toggleFlag('hasAlarm')} />
        </div>

        <div className="p-4 bg-slate-50 rounded-lg">
          <Toggle label="Bicycles Forbidden" checked={flags.bicyclesForbidden} onChange={() => toggleFlag('bicyclesForbidden')} />
        </div>

        <div className="p-4 bg-slate-50 rounded-lg">
          <Toggle label="Memorandum of Lease" checked={flags.memorandum} onChange={() => toggleFlag('memorandum')} />
        </div>
      </div>
    </div>
  );
}
