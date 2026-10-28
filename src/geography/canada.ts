export interface ProvinceMetadata {
  code: string;
  sgcCode: string;
  name: string;
  capital: string;
  timeZones: string[];
  corporateRegistry: string;
  callingCutoffLocalHour: number; // 21:00 or 21:30
}

export const CANADIAN_JURISDICTIONS: Record<string, ProvinceMetadata> = {
  ON: {
    code: 'ON',
    sgcCode: '35',
    name: 'Ontario',
    capital: 'Toronto',
    timeZones: ['America/Toronto', 'America/Thunder_Bay'],
    corporateRegistry: 'Ontario Business Registry (OBR)',
    callingCutoffLocalHour: 21,
  },
  QC: {
    code: 'QC',
    sgcCode: '24',
    name: 'Quebec',
    capital: 'Quebec City',
    timeZones: ['America/Montreal'],
    corporateRegistry: 'Registraire des entreprises du Québec (REQ)',
    callingCutoffLocalHour: 21,
  },
  BC: {
    code: 'BC',
    sgcCode: '59',
    name: 'British Columbia',
    capital: 'Victoria',
    timeZones: ['America/Vancouver'],
    corporateRegistry: 'BC Corporate Registry (BC Registries)',
    callingCutoffLocalHour: 21,
  },
  AB: {
    code: 'AB',
    sgcCode: '48',
    name: 'Alberta',
    capital: 'Edmonton',
    timeZones: ['America/Edmonton'],
    corporateRegistry: 'Alberta Corporate Registry (CORES)',
    callingCutoffLocalHour: 21,
  },
  MB: {
    code: 'MB',
    sgcCode: '46',
    name: 'Manitoba',
    capital: 'Winnipeg',
    timeZones: ['America/Winnipeg'],
    corporateRegistry: 'Companies Office Manitoba',
    callingCutoffLocalHour: 21,
  },
  SK: {
    code: 'SK',
    sgcCode: '47',
    name: 'Saskatchewan',
    capital: 'Regina',
    timeZones: ['America/Regina'],
    corporateRegistry: 'Information Services Corporation (ISC)',
    callingCutoffLocalHour: 21,
  },
  NS: {
    code: 'NS',
    sgcCode: '12',
    name: 'Nova Scotia',
    capital: 'Halifax',
    timeZones: ['America/Halifax'],
    corporateRegistry: 'Nova Scotia Registry of Joint Stock Companies',
    callingCutoffLocalHour: 21,
  },
  NB: {
    code: 'NB',
    sgcCode: '13',
    name: 'New Brunswick',
    capital: 'Fredericton',
    timeZones: ['America/Moncton'],
    corporateRegistry: 'Corporate Affairs New Brunswick',
    callingCutoffLocalHour: 21,
  },
  NL: {
    code: 'NL',
    sgcCode: '10',
    name: 'Newfoundland and Labrador',
    capital: "St. John's",
    timeZones: ['America/St_Johns'],
    corporateRegistry: 'Registry of Companies NL',
    callingCutoffLocalHour: 21,
  },
  PE: {
    code: 'PE',
    sgcCode: '11',
    name: 'Prince Edward Island',
    capital: 'Charlottetown',
    timeZones: ['America/Halifax'],
    corporateRegistry: 'Corporate Registry PEI',
    callingCutoffLocalHour: 21,
  },
  YT: {
    code: 'YT',
    sgcCode: '60',
    name: 'Yukon',
    capital: 'Whitehorse',
    timeZones: ['America/Whitehorse'],
    corporateRegistry: 'Yukon Corporate Affairs',
    callingCutoffLocalHour: 21,
  },
  NT: {
    code: 'NT',
    sgcCode: '61',
    name: 'Northwest Territories',
    capital: 'Yellowknife',
    timeZones: ['America/Yellowknife'],
    corporateRegistry: 'Corporate Registries NWT',
    callingCutoffLocalHour: 21,
  },
  NU: {
    code: 'NU',
    sgcCode: '62',
    name: 'Nunavut',
    capital: 'Iqaluit',
    timeZones: ['America/Iqaluit'],
    corporateRegistry: 'Nunavut Legal Registries',
    callingCutoffLocalHour: 21,
  },
};

export function isValidCanadianProvince(code: string): boolean {
  return Boolean(CANADIAN_JURISDICTIONS[code.toUpperCase()]);
}

export function getProvinceMetadata(code: string): ProvinceMetadata | undefined {
  return CANADIAN_JURISDICTIONS[code.toUpperCase()];
}
