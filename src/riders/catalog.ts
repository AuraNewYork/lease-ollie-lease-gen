export type RiderQuestion =
  | { kind: 'flag'; key: string; label: string; exclusiveGroup?: string }
  | { kind: 'answer'; key: string; label: string; type: 'text' | 'date' };

export interface Rider {
  id: string;
  label: string;
  language: 'EN' | 'ES';
  mandatory: boolean;
  templateKey: string;
  questions: RiderQuestion[];
}

export const RIDER_CATALOG: Rider[] = [
  {
    id: 'windowGuard',
    label: 'Window Guard Notice (NYC)',
    language: 'EN',
    mandatory: true,
    templateKey: 'rbn-a1978-apbe-rider-tagged.docx',
    questions: [
      { kind: 'flag', key: 'wg_childPresent', label: 'A child 10 or younger lives in the apartment', exclusiveGroup: 'wg_children' },
      { kind: 'flag', key: 'wg_noChild', label: 'No child 10 or younger lives in the apartment', exclusiveGroup: 'wg_children' },
      { kind: 'flag', key: 'wg_guardsInstalledAll', label: 'Window guards installed in all windows', exclusiveGroup: 'wg_install' },
      { kind: 'flag', key: 'wg_guardsNotInstalled', label: 'Window guards NOT installed in all windows', exclusiveGroup: 'wg_install' },
      { kind: 'flag', key: 'wg_guardsNeedRepair', label: 'Window guards need maintenance/repair', exclusiveGroup: 'wg_repair' },
      { kind: 'flag', key: 'wg_guardsNoRepair', label: 'Window guards do not need repair', exclusiveGroup: 'wg_repair' },
      { kind: 'flag', key: 'wg_wantGuardsAnyway', label: 'Want guards even with no children (standalone)' },
      { kind: 'answer', key: 'wg_DeadlineDate', label: 'Form return deadline', type: 'date' },
      { kind: 'answer', key: 'wg_SignDate', label: 'Tenant sign date (rider)', type: 'date' },
    ],
  },
  {
    id: 'leadWindowAnnual',
    label: 'Lead Poisoning & Window Falls Annual Notice (NYC)',
    language: 'EN',
    mandatory: true,
    templateKey: 'rbn-b1978-apbe-rider-tagged.docx',
    questions: [
      { kind: 'flag', key: 'wg_child5Present', label: 'A child 5 or younger lives/spends 10+ hrs/wk here (standalone)' },
      { kind: 'flag', key: 'wg_childPresent', label: 'A child 10 or younger lives here', exclusiveGroup: 'lw_children' },
      { kind: 'flag', key: 'wg_noChild', label: 'No child 10 or younger lives here', exclusiveGroup: 'lw_children' },
      { kind: 'flag', key: 'wg_guardsInstalledAll', label: 'Guards installed in all windows', exclusiveGroup: 'lw_install' },
      { kind: 'flag', key: 'wg_guardsNotInstalled', label: 'Guards NOT installed in all windows', exclusiveGroup: 'lw_install' },
      { kind: 'flag', key: 'wg_guardsNeedRepair', label: 'Guards need repair (with-children branch)' },
      { kind: 'flag', key: 'wg_wantGuardsAnyway', label: 'Want guards anyway (no-children branch)' },
      { kind: 'flag', key: 'wg_haveGuardsNeedRepair', label: 'Have guards but need repair (no-children branch)' },
      { kind: 'answer', key: 'wg_NoticeDate', label: 'Notice issue date', type: 'date' },
      { kind: 'answer', key: 'wg_DeadlineDate', label: 'Return deadline', type: 'date' },
      { kind: 'answer', key: 'wg_SignDate', label: 'Tenant sign date (stub)', type: 'date' },
      { kind: 'answer', key: 'TenantFirstName', label: 'Tenant first name', type: 'text' },
      { kind: 'answer', key: 'TenantLastName', label: 'Tenant last name', type: 'text' },
      { kind: 'answer', key: 'TenantMiddleInitial', label: 'Tenant middle initial', type: 'text' },
      { kind: 'answer', key: 'City', label: 'Apartment city', type: 'text' },
      { kind: 'answer', key: 'State', label: 'Apartment state', type: 'text' },
      { kind: 'answer', key: 'Zip', label: 'Apartment ZIP', type: 'text' },
      { kind: 'answer', key: 'TenantPhone', label: 'Tenant phone', type: 'text' },
    ],
  },
  {
    id: 'bedbug',
    label: 'Bedbug Infestation History Disclosure (DBB-N)',
    language: 'EN',
    mandatory: true,
    templateKey: 'rbn-bedbug-rider-tagged.docx',
    questions: [
      { kind: 'flag', key: 'bb_noHistory', label: 'No bedbug history in the past year' },
      { kind: 'flag', key: 'bb_buildingEradicated', label: 'Building infestation — was eradicated', exclusiveGroup: 'bb_building' },
      { kind: 'flag', key: 'bb_buildingNotEradicated', label: 'Building infestation — not eradicated', exclusiveGroup: 'bb_building' },
      { kind: 'answer', key: 'bb_buildingEradicatedFloors', label: 'Eradicated floor(s)', type: 'text' },
      { kind: 'answer', key: 'bb_buildingNotEradicatedFloors', label: 'Not-eradicated floor(s)', type: 'text' },
      { kind: 'flag', key: 'bb_aptEradicated', label: 'Apartment infestation — eradicated', exclusiveGroup: 'bb_apt' },
      { kind: 'flag', key: 'bb_aptNotEradicated', label: 'Apartment infestation — not eradicated', exclusiveGroup: 'bb_apt' },
      { kind: 'flag', key: 'bb_other', label: 'Other (free text)' },
      { kind: 'answer', key: 'bb_otherText', label: 'Other — details', type: 'text' },
      { kind: 'answer', key: 'bb_TenantSignDate', label: 'Tenant sign date', type: 'date' },
      { kind: 'answer', key: 'bb_OwnerSignDate', label: 'Owner sign date', type: 'date' },
    ],
  },
  {
    id: 'allergen',
    label: 'Indoor Allergen Hazards Notice (NYC)',
    language: 'EN',
    mandatory: true,
    templateKey: 'rbn-allergen-rider-tagged.docx',
    questions: [
      { kind: 'answer', key: 'aller_SignDate', label: 'Owner/representative sign date', type: 'date' },
    ],
  },
  {
    id: 'windowGuardES',
    label: 'Window Guard Notice (Spanish)',
    language: 'ES',
    mandatory: false,
    templateKey: 'rbn-a1978-apbs-rider-tagged.docx',
    questions: [],
  },
  {
    id: 'leadWindowAnnualES',
    label: 'Lead & Window Annual Notice (Spanish)',
    language: 'ES',
    mandatory: false,
    templateKey: 'rbn-b1978-apbs-rider-tagged.docx',
    questions: [],
  },
];
