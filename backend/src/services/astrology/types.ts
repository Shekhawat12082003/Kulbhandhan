export type AstrologySettings = {
  ayanamsha: string;
  node_type: 'mean' | 'true';
  observation_point: 'topocentric' | 'geocentric';
  house_system: string;
  zodiac_system: string;
  calculation_method: string;
};

export type BirthInput = {
  dateOfBirth: string;
  birthTime: string;
  birthPlace: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  utcOffsetHours: number;
};

export type AstrologyCalculation = {
  provider: 'navamsha';
  providerVersion: string;
  settings: AstrologySettings;
  rawResponse: Record<string, unknown>;
  normalizedData: Record<string, any>;
};

export type CompatibilityCalculation = {
  provider: 'navamsha';
  providerVersion: string;
  settings: AstrologySettings;
  rawResponse: Record<string, unknown>;
  normalizedData: Record<string, any>;
};