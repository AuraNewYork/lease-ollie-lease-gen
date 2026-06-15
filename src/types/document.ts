import type { LeaseAnswers, LeaseFlags } from './lease';

export type LeaseStatus = 'draft' | 'generated' | 'signed' | 'void';

export interface LeaseDocument {
  id: string;
  created_by: string;
  landlord_id: string | null;
  building: string | null;
  unit: string | null;
  rent_roll_id: string | null;
  status: LeaseStatus;
  answers: LeaseAnswers;
  flags: LeaseFlags;
  created_at: string;
  updated_at: string;
}

export interface LeaseArtifact {
  id: string;
  lease_id: string;
  artifact_type: string;
  storage_path: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}
