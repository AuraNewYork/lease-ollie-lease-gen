import { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import FormField from '@/components/ui/FormField';

interface GuarantorEntry {
  name: string;
  email: string;
}

function parseJson<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export default function Step2Participants() {
  const { answers, updateAnswer, setAnswers } = useWizard();

  // --- Tenant state ---
  const storedCount = Math.min(6, Math.max(1, parseInt(answers.TenantCount || '1', 10) || 1));
  const storedNames = answers.TenantName
    ? answers.TenantName.split(',').map((s) => s.trim())
    : [];
  const storedTenantEmails: string[] = parseJson(answers.tenantEmails || '[]', []);

  const [tenantCount, setTenantCount] = useState(storedCount);
  const [tenantNames, setTenantNames] = useState<string[]>(() => {
    const arr: string[] = [];
    for (let i = 0; i < storedCount; i++) arr.push(storedNames[i] ?? '');
    return arr;
  });
  const [tenantEmails, setTenantEmails] = useState<string[]>(() => {
    const arr: string[] = [];
    for (let i = 0; i < storedCount; i++) {
      arr.push(storedTenantEmails[i] ?? (i === 0 ? (answers.TenantEmail || '') : ''));
    }
    return arr;
  });

  // --- Guarantor state ---
  const storedGCount = Math.min(6, Math.max(0, parseInt(answers.GuarantorCount || '0', 10) || 0));
  const storedGuarantors: GuarantorEntry[] = parseJson(answers.guarantors || '[]', []);

  const [guarantorCount, setGuarantorCount] = useState(storedGCount);
  const [guarantorEntries, setGuarantorEntries] = useState<GuarantorEntry[]>(() => {
    const arr: GuarantorEntry[] = [];
    for (let i = 0; i < storedGCount; i++) {
      arr.push(storedGuarantors[i] ?? { name: '', email: '' });
    }
    return arr;
  });

  // Sync all participant state to wizard answers
  function syncAll(
    names: string[],
    emails: string[],
    gCount: number,
    gEntries: GuarantorEntry[],
  ) {
    setAnswers({
      ...answers,
      TenantName: names.filter((s) => s.trim()).join(', '),
      TenantCount: String(names.length),
      TenantEmail: emails[0] ?? '',
      tenantEmails: JSON.stringify(emails),
      GuarantorCount: String(gCount),
      guarantors: JSON.stringify(gEntries.slice(0, gCount)),
    });
  }

  function handleTenantCountChange(n: number) {
    const newNames = [...tenantNames];
    while (newNames.length < n) newNames.push('');
    newNames.length = n;
    const newEmails = [...tenantEmails];
    while (newEmails.length < n) newEmails.push('');
    newEmails.length = n;
    setTenantCount(n);
    setTenantNames(newNames);
    setTenantEmails(newEmails);
    syncAll(newNames, newEmails, guarantorCount, guarantorEntries);
  }

  function handleTenantNameChange(i: number, value: string) {
    const newNames = [...tenantNames];
    newNames[i] = value;
    setTenantNames(newNames);
    syncAll(newNames, tenantEmails, guarantorCount, guarantorEntries);
  }

  function handleTenantEmailChange(i: number, value: string) {
    const newEmails = [...tenantEmails];
    newEmails[i] = value;
    setTenantEmails(newEmails);
    syncAll(tenantNames, newEmails, guarantorCount, guarantorEntries);
  }

  function handleGuarantorCountChange(n: number) {
    const newEntries = [...guarantorEntries];
    while (newEntries.length < n) newEntries.push({ name: '', email: '' });
    newEntries.length = n;
    setGuarantorCount(n);
    setGuarantorEntries(newEntries);
    syncAll(tenantNames, tenantEmails, n, newEntries);
  }

  function handleGuarantorChange(i: number, field: keyof GuarantorEntry, value: string) {
    const newEntries = [...guarantorEntries];
    newEntries[i] = { ...newEntries[i], [field]: value };
    setGuarantorEntries(newEntries);
    syncAll(tenantNames, tenantEmails, guarantorCount, newEntries);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Step 2: Participants & Payments</h2>

      {/* Owner */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Owner</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Owner Name" value={answers.OwnerName} onChange={(v) => updateAnswer('OwnerName', v)} />
          <FormField label="Owner Email" value={answers.OwnerEmail} onChange={(v) => updateAnswer('OwnerEmail', v)} />
        </div>
        <FormField label="Owner Address" value={answers.OwnerAddress} onChange={(v) => updateAnswer('OwnerAddress', v)} />
      </div>

      {/* Tenants */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Tenant</h3>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Number of tenants</label>
          <select
            value={tenantCount}
            onChange={(e) => handleTenantCountChange(Number(e.target.value))}
            className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {tenantNames.map((name, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label={tenantCount === 1 ? 'Tenant Name' : `Tenant ${i + 1} Name`}
              value={name}
              onChange={(v) => handleTenantNameChange(i, v)}
              placeholder="Full name (avoid commas)"
            />
            <FormField
              label={tenantCount === 1 ? 'Tenant Email' : `Tenant ${i + 1} Email`}
              value={tenantEmails[i] ?? ''}
              onChange={(v) => handleTenantEmailChange(i, v)}
              placeholder="email@example.com"
            />
          </div>
        ))}

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

      {/* Guarantors */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Guarantors</h3>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Number of guarantors</label>
          <select
            value={guarantorCount}
            onChange={(e) => handleGuarantorCountChange(Number(e.target.value))}
            className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
          >
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {guarantorEntries.map((g, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label={`Guarantor ${i + 1} Name`}
              value={g.name}
              onChange={(v) => handleGuarantorChange(i, 'name', v)}
              placeholder="Full name"
            />
            <FormField
              label={`Guarantor ${i + 1} Email`}
              value={g.email}
              onChange={(v) => handleGuarantorChange(i, 'email', v)}
              placeholder="email@example.com"
            />
          </div>
        ))}
      </div>

      {/* Payment */}
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
