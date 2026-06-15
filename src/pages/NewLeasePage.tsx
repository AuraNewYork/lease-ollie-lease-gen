import { WizardProvider } from '@/context/WizardContext';
import WizardShell from '@/components/wizard/WizardShell';

export default function NewLeasePage() {
  return (
    <WizardProvider>
      <WizardShell />
    </WizardProvider>
  );
}
