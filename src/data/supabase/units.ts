import { supabase } from './client';
import type { BuildingConfig, Unit } from '@/types';

export async function fetchBuildings(): Promise<BuildingConfig[]> {
  const { data, error } = await supabase
    .from('building_config')
    .select('id, display_name, db_name, address, city_state_zip, entity, landlord_id')
    .order('display_name');

  if (error) throw new Error(error.message);
  return (data ?? []) as BuildingConfig[];
}

export async function fetchUnitByBuilding(
  building: BuildingConfig,
  unitNumber: string
): Promise<Unit | null> {
  const { data, error } = await supabase
    .from('rent_roll')
    .select(
      'id, bldg, unit, address, short_address, gross, tt1_name, tt2_name, tt3_name, tt4_name, tt1_email, occupant_1_name, occupant_2_name, landlord_id'
    )
    .or(`bldg.eq.${building.db_name},bldg.eq.${building.display_name}`)
    .eq('unit', unitNumber)
    .limit(1);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;
  return data[0] as Unit;
}
