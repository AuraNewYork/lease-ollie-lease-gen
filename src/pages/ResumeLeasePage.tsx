import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardProvider, useWizard } from '@/context/WizardContext';
import WizardShell from '@/components/wizard/WizardShell';
import { fetchLeaseById } from '@/data/supabase/leases';
import { useParams } from 'react-router-dom';

function ResumeLoader() {
  const { id } = useParams<{ id: string }>();
  const { loadDraft } = useWizard();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    fetchLeaseById(id).then((doc) => {
      if (doc) {
        loadDraft(doc);
      } else {
        navigate('/');
      }
    });
  }, [id, loadDraft, navigate]);

  return <WizardShell />;
}

export default function ResumeLeasePage() {
  return (
    <WizardProvider>
      <ResumeLoader />
    </WizardProvider>
  );
}
