import { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import FormField from '@/components/ui/FormField';
import PresetBar from '@/components/wizard/PresetBar';

interface TenantEntry {
  first: string;
  middle: string;
  last: string;
  phone: string;
  email: string;
}

interface GuarantorEntry {
  GuarantorName: string;
  GuarantorAddress: string;
}

function parseJson<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

function fullName(t: TenantEntry): string {
  return [t.first, t.middle, t.last].filter(Boolean).join(' ');
}

export default function Step2Participants() {
  const { answers, updateAnswer, setAnswers } = useWizard();

  // --- Tenant count ---
  const storedCount = Math.min(6, Math.max(1, parseInt(answers.TenantCount || '1', 10) || 1));

  const storedList: TenantEntry[] = parseJson(answers.tenantList || '[]', []);
  const storedEmails: string[] = parseJson(answers.tenantEmails || '[]', []);

  const [tenantCount, setTenantCount] = useState(storedCount);
  const [tenantList, setTenantList] = useState<TenantEntry[]>(() => {
    const arr: TenantEntry[] = [];
    for (let i = 0; i < storedCount; i++) {
      if (storedList[i]) {
        arr.push(storedList[i]);
      } else {
        arr.push({
          first:  i === 0 ? (answers.TenantFirstName     || '') : '',
          middle: i === 0 ? (answers.TenantMiddleInitial || '') : '',
          last:   i === 0 ? (answers.TenantLastName      || '') : '',
          phone:  i === 0 ? (answers.TenantPhone         || '') : '',
          email:  storedEmails[i] ?? (i === 0 ? (answers.TenantEmail || '') : ''),
        });
      }
    }
    return arr;
  });

  // --- Guarantor state ---
  const storedGCount = Math.min(6, Math.max(0, parseInt(answers.GuarantorCount || '0', 10) || 0));
  const rawGuarantors: Record<string, string>[] = parseJson(answers.guarantors || '[]', []);
  const storedGuarantors: GuarantorEntry[] = rawGuarantors.map((g) => ({
    GuarantorName:    g.GuarantorName    || g.name || '',
    GuarantorAddress: g.GuarantorAddress || '',
  }));

  const [guarantorCount, setGuarantorCount] = useState(storedGCount);
  const [guarantorEntries, setGuarantorEntries] = useState<GuarantorEntry[]>(() => {
    const arr: GuarantorEntry[] = [];
    for (let i = 0; i < storedGCount; i++) {
      arr.push(storedGuarantors[i] ?? { GuarantorName: '', GuarantorAddress: '' });
    }
    return arr;
  });

  function syncAll(
    list: TenantEntry[],
    gCount: number,
    gEntries: GuarantorEntry[],
  ) {
    const t0 = list[0] ?? { first: '', middle: '', last: '', phone: '', email: '' };
    setAnswers({
      ...answers,
      TenantName:          list.map(fullName).filter(Boolean).join(', '),
      TenantCount:         String(list.length),
      TenantEmail:         t0.email,
      TenantFirstName:     t0.first,
      TenantMiddleInitial: t0.middle,
      TenantLastName:      t0.last,
      TenantPhone:         t0.phone,
      tenantList:          JSON.stringify(list),
      tenantEmails:        JSON.stringify(list.map((t) => t.email)),
      GuarantorCount:      String(gCount),
      // Include `name` key so the lease-signing engine can display guarantor names
      guarantors: JSON.stringify(
        gEntries.slice(0, gCount).map((g) => ({
          GuarantorName:    g.GuarantorName,
          GuarantorAddress: g.GuarantorAddress,
          name:             g.GuarantorName,
          email:            '',
        }))
      ),
    });
  }

  function handleTenantCountChange(n: number) {
    const updated = [...tenantList];
    while (updated.length < n) updated.push({ first: '', middle: '', last: '', phone: '', email: '' });
    updated.length = n;
    setTenantCount(n);
    setTenantList(updated);
    syncAll(updated, guarantorCount, guarantorEntries);
  }

  function handleTenantFieldChange(i: number, field: keyof TenantEntry, value: string) {
    const updated = tenantList.map((t, idx) => idx === i ? { ...t, [field]: value } : t);
    setTenantList(updated);
    syncAll(updated, guarantorCount, guarantorEntries);
  }

  function handleGuarantorCountChange(n: number) {
    const updated = [...guarantorEntries];
    while (updated.length < n) updated.push({ GuarantorName: '', GuarantorAddress: '' });
    updated.length = n;
    setGuarantorCount(n);
    setGuarantorEntries(updated);
    syncAll(tenantList, n, updated);
  }

  function handleGuarantorChange(i: number, field: keyof GuarantorEntry, value: string) {
    const updated = guarantorEntries.map((g, idx) => idx === i ? { ...g, [field]: value } : g);
    setGuarantorEntries(updated);
    syncAll(tenantList, guarantorCount, updated);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Step 2: Participants & Payments</h2>

      <PresetBar
        scope="participants"
        answerKeys={[
          'OwnerName', 'OwnerEmail', 'OwnerAddress',
          'TenantName', 'TenantEmail', 'TenantCurrentAddress', 'Occupants',
          'TenantCount', 'TenantFirstName', 'TenantMiddleInitial', 'TenantLastName', 'TenantPhone',
          'tenantList', 'tenantEmails',
          'GuarantorCount', 'guarantors',
          'RentAmount', 'SecurityDeposit', 'PaymentMethods', 'SDBank', 'SDBankAddress',
        ]}
        flagKeys={[]}
      />

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

        {tenantList.map((t, i) => (
          <div key={i} className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {tenantCount === 1 ? 'Tenant' : `Tenant ${i + 1}`}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <FormField
                label="First Name"
                value={t.first}
                onChange={(v) => handleTenantFieldChange(i, 'first', v)}
                placeholder="Jane"
              />
              <FormField
                label="Middle Initial"
                value={t.middle}
                onChange={(v) => handleTenantFieldChange(i, 'middle', v)}
                placeholder="M"
              />
              <FormField
                label="Last Name"
                value={t.last}
                onChange={(v) => handleTenantFieldChange(i, 'last', v)}
                placeholder="Doe"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                label="Phone"
                value={t.phone}
                onChange={(v) => handleTenantFieldChange(i, 'phone', v)}
                placeholder="212-555-0000"
              />
              <FormField
                label="Email"
                value={t.email}
                onChange={(v) => handleTenantFieldChange(i, 'email', v)}
                placeholder="email@example.com"
              />
            </div>
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
              value={g.GuarantorName}
              onChange={(v) => handleGuarantorChange(i, 'GuarantorName', v)}
              placeholder="Full legal name"
            />
            <FormField
              label={`Guarantor ${i + 1} Address`}
              value={g.GuarantorAddress}
              onChange={(v) => handleGuarantorChange(i, 'GuarantorAddress', v)}
              placeholder="Full mailing address"
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
