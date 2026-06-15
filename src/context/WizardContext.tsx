import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { LeaseAnswers, LeaseFlags, LeaseDocument, BuildingConfig } from '@/types';
import { DEFAULT_ANSWERS, DEFAULT_FLAGS } from '@/types';
import { createLease, updateLease } from '@/data/supabase/leases';
import { useAuth } from './AuthContext';

export type StartMode = 'existing' | 'manual';

interface WizardState {
  step: number;
  mode: StartMode;
  answers: LeaseAnswers;
  flags: LeaseFlags;
  leaseId: string | null;
  landlordId: string | null;
  building: BuildingConfig | null;
  rentRollId: string | null;
  saving: boolean;
  setStep: (s: number) => void;
  setMode: (m: StartMode) => void;
  setAnswers: (a: LeaseAnswers) => void;
  updateAnswer: (key: keyof LeaseAnswers, value: string) => void;
  setFlags: (f: LeaseFlags) => void;
  toggleFlag: (key: keyof LeaseFlags) => void;
  setBuilding: (b: BuildingConfig | null) => void;
  setLandlordId: (id: string | null) => void;
  setRentRollId: (id: string | null) => void;
  saveProgress: () => Promise<string>;
  loadDraft: (doc: LeaseDocument) => void;
  reset: () => void;
}

const WizardContext = createContext<WizardState | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<StartMode>('existing');
  const [answers, setAnswers] = useState<LeaseAnswers>(DEFAULT_ANSWERS);
  const [flags, setFlags] = useState<LeaseFlags>(DEFAULT_FLAGS);
  const [leaseId, setLeaseId] = useState<string | null>(null);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [building, setBuilding] = useState<BuildingConfig | null>(null);
  const [rentRollId, setRentRollId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateAnswer = useCallback((key: keyof LeaseAnswers, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleFlag = useCallback((key: keyof LeaseFlags) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const saveProgress = useCallback(async (): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    setSaving(true);
    try {
      if (!leaseId) {
        const doc = await createLease({
          created_by: user.id,
          landlord_id: landlordId,
          building: answers.BuildingName || null,
          unit: answers['Apt#'] || null,
          rent_roll_id: rentRollId,
          answers,
          flags,
        });
        setLeaseId(doc.id);
        return doc.id;
      } else {
        await updateLease(leaseId, {
          landlord_id: landlordId,
          building: answers.BuildingName || null,
          unit: answers['Apt#'] || null,
          rent_roll_id: rentRollId,
          answers,
          flags,
        });
        return leaseId;
      }
    } finally {
      setSaving(false);
    }
  }, [user, leaseId, landlordId, answers, flags, rentRollId]);

  const loadDraft = useCallback((doc: LeaseDocument) => {
    setLeaseId(doc.id);
    setAnswers(doc.answers);
    setFlags(doc.flags);
    setLandlordId(doc.landlord_id);
    setRentRollId(doc.rent_roll_id);
    setMode(doc.rent_roll_id ? 'existing' : 'manual');
    setStep(1);
  }, []);

  const reset = useCallback(() => {
    setStep(1);
    setMode('existing');
    setAnswers(DEFAULT_ANSWERS);
    setFlags(DEFAULT_FLAGS);
    setLeaseId(null);
    setLandlordId(null);
    setBuilding(null);
    setRentRollId(null);
  }, []);

  return (
    <WizardContext.Provider
      value={{
        step,
        mode,
        answers,
        flags,
        leaseId,
        landlordId,
        building,
        rentRollId,
        saving,
        setStep,
        setMode,
        setAnswers,
        updateAnswer,
        setFlags,
        toggleFlag,
        setBuilding,
        setLandlordId,
        setRentRollId,
        saveProgress,
        loadDraft,
        reset,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard(): WizardState {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used inside WizardProvider');
  return ctx;
}
