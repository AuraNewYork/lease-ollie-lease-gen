import { useWizard } from '@/context/WizardContext';
import FormField from '@/components/ui/FormField';

export default function Step2Participants() {
  const { answers, updateAnswer } = useWizard();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Step 2: Participants & Payments</h2>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Owner</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Owner Name"
            value={answers.OwnerName}
            onChange={(v) => updateAnswer('OwnerName', v)}
          />
          <FormField
            label="Owner Email"
            value={answers.OwnerEmail}
            onChange={(v) => updateAnswer('OwnerEmail', v)}
          />
        </div>
        <FormField
          label="Owner Address"
          value={answers.OwnerAddress}
          onChange={(v) => updateAnswer('OwnerAddress', v)}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Tenant</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Tenant Name"
            value={answers.TenantName}
            onChange={(v) => updateAnswer('TenantName', v)}
          />
          <FormField
            label="Tenant Email"
            value={answers.TenantEmail}
            onChange={(v) => updateAnswer('TenantEmail', v)}
          />
        </div>
        <FormField
          label="Tenant Current Address"
          value={answers.TenantCurrentAddress}
          onChange={(v) => updateAnswer('TenantCurrentAddress', v)}
        />
        <FormField
          label="Occupants"
          value={answers.Occupants}
          onChange={(v) => updateAnswer('Occupants', v)}
          placeholder="Additional occupants"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Payment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Monthly Rent"
            value={answers.RentAmount}
            onChange={(v) => updateAnswer('RentAmount', v)}
            placeholder="e.g. 3500"
          />
          <FormField
            label="Security Deposit"
            value={answers.SecurityDeposit}
            onChange={(v) => updateAnswer('SecurityDeposit', v)}
            placeholder="e.g. 3500"
          />
        </div>
        <FormField
          label="Payment Methods"
          value={answers.PaymentMethods}
          onChange={(v) => updateAnswer('PaymentMethods', v)}
          placeholder="e.g. Check, ACH, Zelle"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Security Deposit Bank"
            value={answers.SDBank}
            onChange={(v) => updateAnswer('SDBank', v)}
          />
          <FormField
            label="SD Bank Address"
            value={answers.SDBankAddress}
            onChange={(v) => updateAnswer('SDBankAddress', v)}
          />
        </div>
      </div>
    </div>
  );
}
