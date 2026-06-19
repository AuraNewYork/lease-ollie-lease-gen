import { supabase } from './client';
import type { LeaseGenPreset, PresetScope } from '@/types';

export async function listPresets(
  scope: PresetScope,
  landlordId: string | null,
): Promise<LeaseGenPreset[]> {
  let query = supabase
    .from('lease_gen_presets')
    .select('*')
    .eq('scope', scope)
    .order('name', { ascending: true });

  if (landlordId) {
    query = query.or(`landlord_id.is.null,landlord_id.eq.${landlordId}`);
  } else {
    query = query.is('landlord_id', null);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as LeaseGenPreset[];
}

export async function createPreset(params: {
  name: string;
  scope: PresetScope;
  landlord_id: string | null;
  answers: Record<string, string>;
  flags: Record<string, boolean>;
  created_by: string;
}): Promise<LeaseGenPreset> {
  const { data, error } = await supabase
    .from('lease_gen_presets')
    .insert(params)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as LeaseGenPreset;
}

export async function updatePreset(
  id: string,
  patch: Partial<{
    name: string;
    answers: Record<string, string>;
    flags: Record<string, boolean>;
  }>,
): Promise<LeaseGenPreset> {
  const { data, error } = await supabase
    .from('lease_gen_presets')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as LeaseGenPreset;
}

export async function deletePreset(id: string): Promise<void> {
  const { error } = await supabase
    .from('lease_gen_presets')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}
