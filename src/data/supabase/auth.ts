import { supabase } from './client';
import type { Profile } from '@/types';

export async function verifyProfileLogin(
  email: string,
  password: string
): Promise<Profile> {
  const { data, error } = await supabase.rpc('verify_profile_login', {
    p_email: email,
    p_password: password,
  });

  if (error) throw new Error(error.message);
  if (!data || (Array.isArray(data) && data.length === 0)) {
    throw new Error('Invalid email or password');
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    id: row.id,
    full_name: row.full_name,
    role: row.role,
    landlord_id: row.landlord_id,
    email,
  };
}
