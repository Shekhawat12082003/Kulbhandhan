import { AppError } from '../../utils/errors';
import { env } from '../../config/env';
import { navamshaPost, NavamshaResponse } from './navamshaClient';
import { AstrologyCalculation, AstrologySettings, BirthInput, CompatibilityCalculation } from './types';

export const ASTROLOGY_SETTINGS: AstrologySettings = {
  ayanamsha: env.KUNDLI_AYANAMSHA,
  node_type: env.KUNDLI_NODE_TYPE,
  observation_point: env.KUNDLI_OBSERVATION_POINT,
  house_system: env.KUNDLI_HOUSE_SYSTEM,
  zodiac_system: env.KUNDLI_ZODIAC_SYSTEM,
  calculation_method: env.KUNDLI_CALCULATION_METHOD,
};
export const DIVISIONAL_CHARTS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'] as const;

function providerBirth(input: BirthInput, settings = ASTROLOGY_SETTINGS) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.dateOfBirth) ? input.dateOfBirth.split('-').map(Number) : [];
  const time = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(input.birthTime);
  if (date.length !== 3 || !time) throw new AppError(400, 'BIRTH_DETAILS_INVALID', 'Birth date and time must be valid; use YYYY-MM-DD and HH:MM.');
  const [year, month, day] = date;
  const [, hours, minutes, seconds = '0'] = time;
  return {
    year, month, date: day, hours: Number(hours), minutes: Number(minutes), seconds: Number(seconds),
    latitude: input.latitude, longitude: input.longitude, timezone: input.utcOffsetHours,
    settings: { ayanamsha: settings.ayanamsha, node_type: settings.node_type, observation_point: settings.observation_point },
  };
}

function outputOf(response: NavamshaResponse) { return response.output as Record<string, any>; }

function julianDate(utcDateTime?: string) {
  if (!utcDateTime) return null;
  const milliseconds = Date.parse(utcDateTime);
  return Number.isFinite(milliseconds) ? milliseconds / 86_400_000 + 2_440_587.5 : null;
}

function providerVersion(output: Record<string, any>) {
  return String(output.engine_version ?? output.metadata?.engine_version ?? output.calculation_version ?? 'navamsha-api-v1');
}

function findRuleResult(value: any, field: 'rajju' | 'vedha'): unknown {
  if (!value || typeof value !== 'object') return undefined;
  for (const [key, child] of Object.entries(value)) {
    if (key.toLowerCase().replace(/[^a-z]/g, '').includes(field)) return child;
    const nested = findRuleResult(child, field);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

export async function calculateKundli(input: BirthInput): Promise<AstrologyCalculation> {
  const birth = providerBirth(input);
  const requests = {
    kundali: navamshaPost('/api/v1/kundali/basic', birth),
    panchang: navamshaPost('/api/v1/panchang/full', birth),
    houses: navamshaPost('/api/v1/chart/houses', birth),
    relationships: navamshaPost('/api/v1/chart/relationships', birth),
    combustion: navamshaPost('/api/v1/chart/combustion', birth),
    navamsa: navamshaPost('/api/v1/divisional/d9', birth),
    d1Svg: navamshaPost('/api/v1/d1-chart-svg-code', { ...birth, chart_config: { chart_style: 'north_india', hide_time_location: true } }),
    d9Svg: navamshaPost('/api/v1/d9-chart-svg-code', { ...birth, chart_config: { chart_style: 'north_india', hide_time_location: true } }),
    vimshottari: navamshaPost('/api/v1/dasha/vimshottari', birth),
    dashaPeriods: navamshaPost('/api/v2/astrology/dasha-periods', { ...birth, depth: 3, full_dasha: true }),
    manglik: navamshaPost('/api/v1/dosha/mangal', birth),
    additionalDoshas: navamshaPost('/api/v1/dosha/all', birth),
  };
  const responses = await Promise.all(Object.values(requests));
  const rawResponse = Object.fromEntries(Object.keys(requests).map((key, index) => [key, responses[index]]));
  const raw = Object.fromEntries(Object.entries(rawResponse).map(([key, value]) => [key, outputOf(value as NavamshaResponse)]));
  const kundali = raw.kundali;

  if (!kundali.ascendant || !kundali.planets || !kundali.planets.Moon) {
    throw new AppError(502, 'ASTROLOGY_RESPONSE_INVALID', 'Navamsha returned an incomplete birth chart.');
  }

  return {
    provider: 'navamsha',
    providerVersion: providerVersion(kundali),
    settings: ASTROLOGY_SETTINGS,
    rawResponse,
    normalizedData: {
      birth: {
        ...input,
        julianDate: julianDate(kundali.utc_datetime),
        utcDateTime: kundali.utc_datetime ?? null,
      },
      lagna: kundali.ascendant,
      rashi: {
        sign: kundali.planets.Moon.zodiac_sign_name ?? null,
        longitude: kundali.planets.Moon.fullDegree ?? null,
      },
      nakshatra: {
        name: kundali.planets.Moon.nakshatra_name ?? null,
        pada: kundali.planets.Moon.nakshatra_pada ?? null,
        lord: kundali.planets.Moon.nakshatra_vimsottari_lord ?? null,
      },
      planets: kundali.planets,
      houses: raw.houses,
      panchang: raw.panchang,
      charts: { D1: { placements: kundali, svg: raw.d1Svg }, D9: { placements: raw.navamsa, svg: raw.d9Svg } },
      dasha: { vimshottari: raw.vimshottari, periods: raw.dashaPeriods },
      relationships: raw.relationships,
      combustion: raw.combustion,
      dosha: { manglik: raw.manglik, additional: raw.additionalDoshas },
      notEvaluated: ['Rajju cancellation', 'Vedha cancellation rules', 'Nadi cancellation', 'Bhakoot cancellation'],
    },
  };
}

export async function calculateDivisionalChart(input: BirthInput, chartCode: typeof DIVISIONAL_CHARTS[number]) {
  const birth = providerBirth(input);
  const [chart, svg] = await Promise.all([
    navamshaPost(`/api/v1/divisional/${chartCode.toLowerCase()}`, birth),
    navamshaPost(`/api/v1/${chartCode.toLowerCase()}-chart-svg-code`, {
      ...birth, chart_config: { chart_style: 'north_india', hide_time_location: true },
    }),
  ]);
  return {
    rawResponse: { chart, svg },
    normalizedData: { placements: chart.output, svg: svg.output, variant: (chart.output as any)?.variant ?? null },
  };
}

export async function calculateCompatibility(bride: BirthInput, groom: BirthInput): Promise<CompatibilityCalculation> {
  const settings = ASTROLOGY_SETTINGS;
  const [ashtakootResponse, manglik, porutham] = await Promise.all([
    navamshaPost('/api/v1/compatibility/ashtakoot/detailed', {
      bride: providerBirth(bride, settings), groom: providerBirth(groom, settings),
    }),
    navamshaPost('/api/v1/compatibility/manglik', {
      person_a: providerBirth(bride, settings), person_b: providerBirth(groom, settings),
    }),
    navamshaPost('/api/v1/matchmaking/tamil-marriage/detailed', {
      bride: providerBirth(bride, settings), groom: providerBirth(groom, settings),
    }),
  ]);
  const match = outputOf(ashtakootResponse);
  const southIndian = outputOf(porutham);
  const sourceBreakdown = match.breakdown;
  if (!sourceBreakdown || typeof sourceBreakdown !== 'object') {
    throw new AppError(502, 'ASTROLOGY_MATCH_RESPONSE_INVALID', 'Navamsha returned an incomplete Ashtakoot result.');
  }
  const kootaSources: [string, string[]][] = [
    ['varna', ['varna']], ['vashya', ['vashya']], ['tara', ['tara']], ['yoni', ['yoni']],
    ['graha_maitri', ['graha_maitri', 'maitri']], ['gana', ['gana', 'gan']], ['bhakoot', ['bhakoot', 'bhakut']], ['nadi', ['nadi']],
  ];
  let score = 0;
  let maximum = 0;
  const breakdown: Record<string, any> = {};
  for (const [name, aliases] of kootaSources) {
    const entry = aliases.map((alias) => sourceBreakdown[alias]).find((candidate) => candidate && typeof candidate === 'object');
    const points = Number(entry?.score ?? entry?.effective_score ?? entry?.received_points ?? entry?.points);
    const maxPoints = Number(entry?.maximum ?? entry?.max ?? entry?.total_points ?? entry?.maximum_points);
    if (!Number.isFinite(points) || !Number.isFinite(maxPoints)) {
      throw new AppError(502, 'ASTROLOGY_MATCH_RESPONSE_INVALID', `Navamsha did not return a scored ${name} koota.`);
    }
    score += points;
    maximum += maxPoints;
    breakdown[name] = { ...entry, score: points, maximum: maxPoints };
  }
  if (maximum !== 36) throw new AppError(502, 'ASTROLOGY_MATCH_RESPONSE_INVALID', 'Navamsha returned an unexpected Ashtakoot maximum.');
  const ashtakoot = { ...match, breakdown, providerTotal: match.total_score ?? match.total?.score ?? null, maximum_score: maximum };
  return {
    provider: 'navamsha',
    providerVersion: 'navamsha-api-v1',
    settings,
    rawResponse: { ashtakoot: ashtakootResponse, manglik, southIndianPorutham: porutham },
    normalizedData: {
      overallScore: { guna: score, maximum, compatibility: score >= 24 ? 'HIGH' : score >= 18 ? 'MODERATE' : 'LOW', policy: 'kulbandhan-guna-thresholds-v1' },
      ashtakoot,
      dosha: {
        manglik: outputOf(manglik),
        nadi: breakdown.nadi,
        bhakoot: breakdown.bhakoot,
        rajju: findRuleResult(southIndian, 'rajju') ?? { status: 'not_evaluated' },
        vedha: findRuleResult(southIndian, 'vedha') ?? { status: 'not_evaluated' },
        detailedAshtakootNotes: match.dosha_notes ?? null,
      },
      regionalPorutham: southIndian,
    },
  };
}

export type { AstrologySettings, BirthInput, AstrologyCalculation, CompatibilityCalculation } from './types';