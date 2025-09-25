export type AvailabilitySlot = {
  date: string;
  start_time: string;
  end_time: string;
};

export type ContractorProfile = {
  name: string | null;
  country: string | null;
  city: string | null;
  company_name: string | null;
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
  | { role: 'contractor'; profile: ContractorProfile }
  | { role: 'subcontractor'; profile: SubcontractorProfile }
  | { role: 'homeowner'; profile: HomeownerProfile };
