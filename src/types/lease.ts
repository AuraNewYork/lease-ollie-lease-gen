export interface LeaseAnswers {
  LeaseCreationDate: string;
  LeaseStartDate: string;
  LeaseEndDate: string;
  BuildingName: string;
  Address: string;
  'Apt#': string;
  AptFlr: string;
  UtilitiesIncluded: string;
  OwnerName: string;
  OwnerAddress: string;
  OwnerEmail: string;
  TenantName: string;
  TenantEmail: string;
  TenantCurrentAddress: string;
  Occupants: string;
  RentAmount: string;
  PaymentMethods: string;
  SecurityDeposit: string;
  SDBank: string;
  SDBankAddress: string;
  Furniture: string;
  OwnershipWork: string;
  ApprovedAlterations: string;
  SubMeteredUtilities: string;
  TTApplianceRepairCost: string;
  MinInsuranceNum: string;
  MinInsuranceTxt: string;
  MaxInsuranceNum: string;
  MaxInsuranceTxt: string;
  PetTypes: string;
  OwnersBroker: string;
  TenantsBroker: string;
  ExtensionYears: string;
  ExtensionStartDate: string;
  ExtensionEndDate: string;
  ExtensionRent: string;
}

export interface LeaseFlags {
  furnitureIncluded: boolean;
  hasOutdoorSpace: boolean;
  builtBefore1978: boolean;
  hasAlarm: boolean;
  approvedAlterations: boolean;
  subMetered: boolean;
  applianceRepair: boolean;
  glInsurance: boolean;
  extension: boolean;
  petsAllowed: boolean;
  bicyclesForbidden: boolean;
  brokersRetained: boolean;
  ownerWork: boolean;
  memorandum: boolean;
}

export const DEFAULT_ANSWERS: LeaseAnswers = {
  LeaseCreationDate: '',
  LeaseStartDate: '',
  LeaseEndDate: '',
  BuildingName: '',
  Address: '',
  'Apt#': '',
  AptFlr: '',
  UtilitiesIncluded: '',
  OwnerName: '',
  OwnerAddress: '',
  OwnerEmail: 'leasing@auranewyork.com',
  TenantName: '',
  TenantEmail: '',
  TenantCurrentAddress: '',
  Occupants: '',
  RentAmount: '',
  PaymentMethods: '',
  SecurityDeposit: '',
  SDBank: '',
  SDBankAddress: '',
  Furniture: '',
  OwnershipWork: '',
  ApprovedAlterations: '',
  SubMeteredUtilities: '',
  TTApplianceRepairCost: '',
  MinInsuranceNum: '',
  MinInsuranceTxt: '',
  MaxInsuranceNum: '',
  MaxInsuranceTxt: '',
  PetTypes: '',
  OwnersBroker: '',
  TenantsBroker: '',
  ExtensionYears: '',
  ExtensionStartDate: '',
  ExtensionEndDate: '',
  ExtensionRent: '',
};

export const DEFAULT_FLAGS: LeaseFlags = {
  furnitureIncluded: false,
  hasOutdoorSpace: false,
  builtBefore1978: false,
  hasAlarm: false,
  approvedAlterations: false,
  subMetered: false,
  applianceRepair: false,
  glInsurance: false,
  extension: false,
  petsAllowed: false,
  bicyclesForbidden: false,
  brokersRetained: false,
  ownerWork: false,
  memorandum: false,
};
