import { supabase } from './client';
import type { CustomRider, LeaseRiderLink } from '@/types';

export async function fetchRiders(landlordId: string | null): Promise<CustomRider[]> {
  let query = supabase
    .from('custom_riders')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (landlordId) {
    query = query.or(`landlord_id.eq.${landlordId},landlord_id.is.null`);
  } else {
    query = query.is('landlord_id', null);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as CustomRider[];
}

export async function createRider(params: {
  landlord_id: string | null;
  name: string;
  body_html: string;
  created_by: string;
}): Promise<CustomRider> {
  const { data, error } = await supabase
    .from('custom_riders')
    .insert({ ...params, is_active: true })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CustomRider;
}

export async function updateRider(
  id: string,
  params: Partial<{ name: string; body_html: string; is_active: boolean }>
): Promise<CustomRider> {
  const { data, error } = await supabase
    .from('custom_riders')
    .update({ ...params, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CustomRider;
}

export async function deleteRider(id: string): Promise<void> {
  const { error } = await supabase
    .from('custom_riders')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function fetchLeaseRiderLinks(leaseId: string): Promise<LeaseRiderLink[]> {
  const { data, error } = await supabase
    .from('lease_rider_links')
    .select('*')
    .eq('lease_id', leaseId)
    .order('sort_order');

  if (error) throw new Error(error.message);
  return (data ?? []) as LeaseRiderLink[];
}

export async function attachRiderToLease(
  leaseId: string,
  riderId: string,
  sortOrder: number
): Promise<LeaseRiderLink> {
  const { data, error } = await supabase
    .from('lease_rider_links')
    .upsert(
      { lease_id: leaseId, custom_rider_id: riderId, sort_order: sortOrder },
      { onConflict: 'lease_id,custom_rider_id' }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as LeaseRiderLink;
}

export async function detachRiderFromLease(leaseId: string, riderId: string): Promise<void> {
  const { error } = await supabase
    .from('lease_rider_links')
    .delete()
    .eq('lease_id', leaseId)
    .eq('custom_rider_id', riderId);

  if (error) throw new Error(error.message);
}
