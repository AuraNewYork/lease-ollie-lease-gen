export interface Unit {
  id: string;
  bldg: string;
  unit: string;
  address: string;
  short_address: string;
  gross: number | null;
  tt1_name: string | null;
  tt2_name: string | null;
  tt3_name: string | null;
  tt4_name: string | null;
  tt1_email: string | null;
  occupant_1_name: string | null;
  occupant_2_name: string | null;
  landlord_id: string | null;
}

export interface BuildingConfig {
  id: string;
  display_name: string;
  db_name: string;
  address: string;
  city_state_zip: string;
  entity: string;
  landlord_id: string;
}
