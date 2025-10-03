export type AvailabilitySlot = {
  date: string;
  start_time: string;
  end_time: string;
};

export type BusinessLocation = {
  country: string;
  province: string | null;
  cities: string[];
};

export type ContractorProfile = {
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  business_location: BusinessLocation | null;
  birthday: string | null;
  gender: string | null;
  years_in_business: number | null;
  image_url: string | null;
};

export type SubcontractorProfile = {
  name: string | null;
  bio: string | null;
  skills: string[];
  services: string[];
  years_of_experience: number | null;
  rates: number | null;
  area: string | null;
  image_url: string | null;
  availability: AvailabilitySlot[];
};

export type HomeownerProfile = {
  name: string | null;
  city: string | null;
  investment_min: number | null;
  investment_max: number | null;
  image_url: string | null;
};

export type ProfileResponse =
  | { role: 'contractor'; profile: ContractorProfile; email?: string; username?: string }
  | { role: 'subcontractor'; profile: SubcontractorProfile }
  | { role: 'homeowner'; profile: HomeownerProfile };
