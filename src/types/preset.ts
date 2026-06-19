export type PresetScope = 'full' | 'lease' | 'participants' | 'clauses' | 'riders';

export interface LeaseGenPreset {
  id: string;
  landlord_id: string | null;
  name: string;
  scope: PresetScope;
  answers: Record<string, string>;
  flags: Record<string, boolean>;
  created_by: string;
  created_at: string;
  updated_at: string;
}
