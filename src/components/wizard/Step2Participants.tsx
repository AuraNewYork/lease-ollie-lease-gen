import { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import FormField from '@/components/ui/FormField';

export default function Step2Participants() {
  const { answers, updateAnswer, setAnswers } = useWizard();

  const storedCount = Math.min(6, Math.max(1, parseInt(answers.TenantCount || '1', 10) || 1));
  const storedNames = answers.TenantName
    ? answers.TenantName.split(',').map((s) => s.trim())
    : [];

  const [tenantCount, setTenantCount] = useState(storedCount);
  const [tenantNames, setTenantNames] = useState<string[]>(() => {
    const arr: string[] = [];
    for (let i = 0; i < storedCount; i++) {
      arr.push(storedNames[i] ?? '');
    }
    return arr;
  });

  function handleCountChange(n: number) {
    const newNames = [...tenantNames];
    while (newNames.length < n) newNames.push('');
    newNames.length = n;
    setTenantCount(n);
    setTenantNames(newNames);
    setAnswers({
      ...answers,
      TenantName: newNames.filter((s) => s.trim()).join(', '),
      TenantCount: String(n),
    });
  }

  function handleNameChange(index: number, value: string) {
    const newNames = [...tenantNames];
    newNames[index] = value;
    setTenantNames(newNames);
    setAnswers({
      ...answers,
      TenantName: newNames.filter((s) => s.trim()).join(', '),
      TenantCount: String(tenantCount),
    });
  }

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

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Number of tenants</label>
          <select
            value={tenantCount}
            onChange={(e) => handleCountChange(Number(e.target.value))}
            className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {tenantNames.map((name, i) => (
          <FormField
            key={i}
            label={tenantCount === 1 ? 'Tenant Name' : `Tenant ${i + 1} Name`}
            value={name}
            onChange={(v) => handleNameChange(i, v)}
            placeholder="Full name (avoid commas)"
          />
        ))}

        <FormField
          label="Tenant Email"
          value={answers.TenantEmail}
          onChange={(v) => updateAnswer('TenantEmail', v)}
        />
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
