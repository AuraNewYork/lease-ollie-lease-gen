import { useWizard } from '@/context/WizardContext';
import Step1Lease from './Step1Lease';
import Step2Participants from './Step2Participants';
import Step3Clauses from './Step3Clauses';
import Step4Riders from './Step4Riders';
import Step5Finalize from './Step5Finalize';
import { ChevronLeft, ChevronRight, Loader as Loader2, Save } from 'lucide-react';

const STEP_LABELS = ['Lease & Property', 'Participants', 'Clauses', 'Riders', 'Generate'];

export default function WizardShell() {
  const { step, setStep, saving, saveProgress } = useWizard();

  async function handleNext() {
    await saveProgress();
    setStep(step + 1);
  }

  async function handleBack() {
    setStep(step - 1);
  }

  async function handleSave() {
    await saveProgress();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <nav className="mb-8">
        <ol className="flex items-center gap-1">
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === step;
            const isComplete = stepNum < step;
            return (
              <li key={label} className="flex-1">
                <button
                  type="button"
                  onClick={() => stepNum < step && setStep(stepNum)}
                  disabled={stepNum > step}
                  className={`w-full text-center px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isComplete
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{stepNum}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
        {step === 1 && <Step1Lease />}
        {step === 2 && <Step2Participants />}
        {step === 3 && <Step3Clauses />}
        {step === 4 && <Step4Riders />}
        {step === 5 && <Step5Finalize />}
      </div>

      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>

          {step < 5 && (
            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next <ChevronRight className="w-4 h-4" /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
