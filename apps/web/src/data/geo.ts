export const COUNTRY_OPTIONS = [
  { code: 'CA', label: 'Canada' },
] as const;

export const CANADA_PROVINCES = [
  { code: 'AB', label: 'Alberta' },
  { code: 'BC', label: 'British Columbia' },
  { code: 'MB', label: 'Manitoba' },
  { code: 'NB', label: 'New Brunswick' },
  { code: 'NL', label: 'Newfoundland and Labrador' },
  { code: 'NS', label: 'Nova Scotia' },
  { code: 'ON', label: 'Ontario' },
  { code: 'PE', label: 'Prince Edward Island' },
  { code: 'QC', label: 'Quebec' },
  { code: 'SK', label: 'Saskatchewan' },
  { code: 'NT', label: 'Northwest Territories' },
  { code: 'NU', label: 'Nunavut' },
  { code: 'YT', label: 'Yukon' },
] as const;

export const PROVINCES_BY_COUNTRY: Record<string, readonly { code: string; label: string }[]> = {
  CA: CANADA_PROVINCES,
};

export const COUNTRY_LABELS = COUNTRY_OPTIONS.reduce<Record<string, string>>((acc, item) => {
  acc[item.code] = item.label;
  return acc;
}, {});

export const PROVINCE_LABELS = CANADA_PROVINCES.reduce<Record<string, string>>((acc, item) => {
  acc[item.code] = item.label;
  return acc;
}, {});
