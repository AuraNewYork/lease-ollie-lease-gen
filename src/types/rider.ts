export interface CustomRider {
  id: string;
  landlord_id: string;
  name: string;
  body_html: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LeaseRiderLink {
  id: string;
  lease_id: string;
  custom_rider_id: string;
  sort_order: number;
  created_at: string;
}
