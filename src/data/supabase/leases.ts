import { supabase } from './client';
import type { LeaseDocument, LeaseAnswers, LeaseFlags } from '@/types';

export async function createLease(params: {
  created_by: string;
  landlord_id: string | null;
  building: string | null;
  unit: string | null;
  rent_roll_id: string | null;
  answers: LeaseAnswers;
  flags: LeaseFlags;
}): Promise<LeaseDocument> {
  const { data, error } = await supabase
    .from('lease_documents')
    .insert({
      ...params,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as LeaseDocument;
}

export async function updateLease(
  id: string,
  params: Partial<{
    landlord_id: string | null;
    building: string | null;
    unit: string | null;
    rent_roll_id: string | null;
    answers: LeaseAnswers;
    flags: LeaseFlags;
    status: string;
  }>
): Promise<LeaseDocument> {
  const { data, error } = await supabase
    .from('lease_documents')
    .update({ ...params, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as LeaseDocument;
}

export async function fetchLeases(userId: string, isAdmin: boolean): Promise<LeaseDocument[]> {
  let query = supabase
    .from('lease_documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (!isAdmin) {
    query = query.eq('created_by', userId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as LeaseDocument[];
}

export async function fetchLeaseById(id: string): Promise<LeaseDocument | null> {
  const { data, error } = await supabase
    .from('lease_documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }
  return data as LeaseDocument;
}
