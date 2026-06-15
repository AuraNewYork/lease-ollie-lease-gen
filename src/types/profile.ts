export interface Profile {
  id: string;
  full_name: string;
  role: string;
  landlord_id: string | null;
  email?: string;
}
