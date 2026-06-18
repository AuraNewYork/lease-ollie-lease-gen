import PremadeRiders from './PremadeRiders';

export default function Step4Riders() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Step 4: Riders</h2>
        <p className="text-sm text-slate-500 mt-1">
          Select premade NYC disclosure riders and fill in their details.
        </p>
      </div>

      <PremadeRiders />

      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-base font-semibold text-slate-900 mb-1">Custom Riders — coming soon</h3>
        <p className="text-sm text-slate-500">
          Custom riders aren't included in the generated lease yet. Use the NYC disclosure riders above.
        </p>
      </div>
    </div>
  );
}
