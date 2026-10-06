import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { KundliBirthData, KundliMatchReport, KundliSnapshot } from '../models/Kundli';
import { Profile } from '../models/Profile';
import { accessLevel } from '../services/matrimony';
import { calculateCompatibility, calculateKundli, calculateDivisionalChart, ASTROLOGY_SETTINGS, DIVISIONAL_CHARTS } from '../services/astrology/astrologyService';
import { BirthDetails, getBirthDetails, removeBirthDetails } from '../services/astrology/birthData';
import { BirthInput } from '../services/astrology/types';
import { AppError } from '../utils/errors';
import { decryptKundliData, encryptKundliData, hashKundliData } from '../utils/secureKundliData';

const uid = (req: Request) => req.auth!.userId;

function validateBirthTimezone(dateOfBirth: string, birthTime: string, timezone: string, utcOffsetHours: number) {
  const [year, month, day] = dateOfBirth.split('-').map(Number);
  const [hour, minute, second = 0] = birthTime.split(':').map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const candidate = new Date(localAsUtc - utcOffsetHours * 3_600_000);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(candidate);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const matchesLocalTime = value('year') === year && value('month') === month && value('day') === day &&
    value('hour') === hour && value('minute') === minute && value('second') === second;
  if (!matchesLocalTime) throw new AppError(400, 'TIMEZONE_OFFSET_MISMATCH', 'The UTC offset does not match this IANA timezone at the entered birth time.');
}

function providerInput(profile: any, details: BirthDetails): BirthInput {
  const required = [details.birthTime, details.birthPlace, details.city, details.state, details.country, details.latitude,
    details.longitude, details.timezone, details.utcOffsetHours];
  if (required.some((value) => value === undefined || value === null || value === '')) {
    throw new AppError(400, 'BIRTH_DETAILS_REQUIRED', 'Enter exact birth time, birthplace, city, state, country, coordinates, timezone, and UTC offset.');
  }
  try { new Intl.DateTimeFormat('en-US', { timeZone: details.timezone }).format(new Date()); }
  catch { throw new AppError(400, 'TIMEZONE_INVALID', 'Enter a valid IANA timezone such as Asia/Kolkata.'); }
  validateBirthTimezone(new Date(profile.dateOfBirth).toISOString().slice(0, 10), details.birthTime!, details.timezone!, details.utcOffsetHours!);

  return {
    dateOfBirth: new Date(profile.dateOfBirth).toISOString().slice(0, 10),
    birthTime: details.birthTime!, birthPlace: details.birthPlace!, city: details.city!, state: details.state!, country: details.country!,
    latitude: details.latitude!, longitude: details.longitude!, timezone: details.timezone!, utcOffsetHours: details.utcOffsetHours!,
  };
}

async function cachedOrCalculate(userId: string, birth: BirthInput) {
  const inputHash = hashKundliData({ birth, settings: ASTROLOGY_SETTINGS });
  const cached = await KundliSnapshot.findOne({ userId, inputHash });
  if (cached) return {
    inputHash,
    normalizedData: decryptKundliData<Record<string, unknown>>(cached.normalizedData),
    rawResponse: decryptKundliData<Record<string, unknown>>(cached.rawResponse),
    providerVersion: cached.providerVersion,
    settings: cached.settings as typeof ASTROLOGY_SETTINGS,
  };

  const calculation = await calculateKundli(birth);
  const values = {
    userId, inputHash, provider: calculation.provider, providerVersion: calculation.providerVersion, settings: calculation.settings,
    rawResponse: encryptKundliData(calculation.rawResponse), normalizedData: encryptKundliData(calculation.normalizedData), calculatedAt: new Date(),
  };
  try { await KundliSnapshot.create(values); }
  catch (error: any) {
    if (error.code !== 11000) throw error;
  }
  const saved = await KundliSnapshot.findOne({ userId, inputHash });
  if (!saved) throw new AppError(500, 'KUNDLI_SAVE_FAILED', 'Calculated Kundli could not be saved.');
  return {
    inputHash,
    normalizedData: decryptKundliData<Record<string, unknown>>(saved.normalizedData),
    rawResponse: decryptKundliData<Record<string, unknown>>(saved.rawResponse),
    providerVersion: saved.providerVersion,
    settings: saved.settings as typeof ASTROLOGY_SETTINGS,
  };
}

export async function getMyKundli(req: Request, res: Response) {
  const userId = uid(req);
  const profile = await Profile.findOne({ userId });
  if (!profile) throw new AppError(409, 'PROFILE_REQUIRED', 'Complete your profile first.');
  const birthDetails = await getBirthDetails(userId);
  let kundli: Record<string, unknown> | null = null;
  let calculation: Record<string, unknown> | null = null;
  if (birthDetails) {
    try {
      const birth = providerInput(profile, birthDetails);
      const inputHash = hashKundliData({ birth, settings: ASTROLOGY_SETTINGS });
      const snapshot = await KundliSnapshot.findOne({ userId, inputHash });
      if (snapshot) {
        kundli = decryptKundliData(snapshot.normalizedData);
        calculation = { provider: snapshot.provider, providerVersion: snapshot.providerVersion, calculatedAt: snapshot.calculatedAt, settings: snapshot.settings };
      }
    } catch (error) {
      if (!(error instanceof AppError) || !['BIRTH_DETAILS_REQUIRED', 'TIMEZONE_INVALID', 'TIMEZONE_OFFSET_MISMATCH', 'BIRTH_DETAILS_INVALID'].includes(error.code)) throw error;
    }
  }
  res.json({ success: true, data: {
    profile: { displayName: profile.displayName, gender: profile.gender },
    dateOfBirth: profile.dateOfBirth,
    birthDetails, kundli, calculation, settings: ASTROLOGY_SETTINGS,
  } });
}

export async function generateKundli(req: Request, res: Response) {
  const userId = uid(req);
  const profile = await Profile.findOne({ userId });
  if (!profile) throw new AppError(409, 'PROFILE_REQUIRED', 'Complete your profile first.');
  const details = await getBirthDetails(userId);
  if (!details) throw new AppError(400, 'BIRTH_DETAILS_REQUIRED', 'Add exact birth details in your profile first.');
  const calculation = await cachedOrCalculate(userId, providerInput(profile, details));
  res.json({ success: true, data: { kundli: calculation.normalizedData, provider: 'navamsha', providerVersion: calculation.providerVersion, settings: calculation.settings } });
}

export async function deleteMyBirthDetails(req: Request, res: Response) {
  const userId = uid(req);
  await removeBirthDetails(userId);
  res.json({ success: true, message: 'Birth time and location, saved Kundli results, and compatibility reports were deleted. Date of birth remains for age eligibility.' });
}

export async function getDivisionalChart(req: Request, res: Response) {
  const chartCode = String(req.params.chartCode).toUpperCase();
  if (!DIVISIONAL_CHARTS.includes(chartCode as typeof DIVISIONAL_CHARTS[number])) {
    throw new AppError(400, 'CHART_UNSUPPORTED', 'Choose a divisional chart supported by Navamsha.');
  }
  const userId = uid(req);
  const profile = await Profile.findOne({ userId });
  if (!profile) throw new AppError(409, 'PROFILE_REQUIRED', 'Complete your profile first.');
  const details = await getBirthDetails(userId);
  if (!details) throw new AppError(400, 'BIRTH_DETAILS_REQUIRED', 'Add complete birth details first.');
  const birth = providerInput(profile, details);
  const snapshot = await cachedOrCalculate(userId, birth);
  const existingCharts = (snapshot.normalizedData.charts ?? {}) as Record<string, unknown>;
  if (existingCharts[chartCode]) return res.json({ success: true, data: { chartCode, chart: existingCharts[chartCode] } });

  const calculation = await calculateDivisionalChart(birth, chartCode as typeof DIVISIONAL_CHARTS[number]);
  const normalizedData = { ...snapshot.normalizedData, charts: { ...existingCharts, [chartCode]: calculation.normalizedData } };
  const rawResponse = { ...snapshot.rawResponse, [chartCode]: calculation.rawResponse };
  const inputHash = hashKundliData({ birth, settings: ASTROLOGY_SETTINGS });
  await KundliSnapshot.updateOne({ userId, inputHash }, {
    $set: { normalizedData: encryptKundliData(normalizedData), rawResponse: encryptKundliData(rawResponse) },
  });
  res.json({ success: true, data: { chartCode, chart: calculation.normalizedData } });
}

function compareFamilyField(valueA?: string, valueB?: string) {
  if (!valueA?.trim() || !valueB?.trim()) return { person_a: valueA ?? null, person_b: valueB ?? null, status: 'not_entered' };
  return { person_a: valueA, person_b: valueB, status: valueA.trim().toLocaleLowerCase() === valueB.trim().toLocaleLowerCase() ? 'same' : 'different' };
}

function familyCompatibility(bride: any, groom: any) {
  const checks = {
    gotra: compareFamilyField(bride.heritage?.gotra, groom.heritage?.gotra),
    kul: compareFamilyField(bride.heritage?.kul, groom.heritage?.kul),
    vansh: compareFamilyField(bride.heritage?.vansh, groom.heritage?.vansh),
    dadera: compareFamilyField(bride.lineage?.paternal, groom.lineage?.paternal),
    nanihal: compareFamilyField(bride.lineage?.maternal, groom.lineage?.maternal),
  };
  const gotraStatus = checks.gotra.status === 'same' ? 'review_required' : 'not_assessed';
  return {
    status: gotraStatus,
    rulesVersion: 'kulbandhan-lineage-review-v1',
    checks,
    note: checks.gotra.status === 'same'
      ? 'Both profiles report the same Gotra. This is a family review flag, not an automatic incompatibility ruling.'
      : 'No family-specific restrictions are configured. Review lineage details with both families.',
  };
}

const privateBirthKeys = new Set(['birth', 'birthdate', 'dateofbirth', 'birthtime', 'localtime', 'utcdatetime', 'latitude', 'longitude', 'timezone', 'utcoffsethours']);

function publicChart(chart: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(chart)
    .filter(([key]) => !privateBirthKeys.has(key.toLowerCase().replace(/[_-]/g, '')))
    .map(([key, value]) => [key, Array.isArray(value)
      ? value.map((item) => item && typeof item === 'object' ? publicChart(item) : item)
      : value && typeof value === 'object' ? publicChart(value) : value]));
}

export async function compatibility(req: Request, res: Response) {
  if (!Types.ObjectId.isValid(req.params.userId)) throw new AppError(400, 'BAD_ID', 'Invalid id.');
  const me = uid(req), other = req.params.userId;
  if (other === me) throw new AppError(400, 'SELF', 'Choose another profile.');
  const level = await accessLevel(me, other);
  if (level !== 'matched') throw new AppError(403, 'MATCH_REQUIRED', 'Kundli reports are available after a mutual match.');

  const [profileA, profileB] = await Promise.all([
    Profile.findOne({ userId: me }), Profile.findOne({ userId: other }),
  ]);
  if (!profileA || !profileB) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Profile not found.');
  if (profileA.gender === profileB.gender) throw new AppError(400, 'GENDER_PAIR_UNSUPPORTED', 'Vedic Gun Milan currently requires one bride and one groom profile.');
  const [birthA, birthB] = await Promise.all([getBirthDetails(me), getBirthDetails(other)]);
  if (!birthA || !birthB) throw new AppError(409, 'BIRTH_DETAILS_REQUIRED', 'Both matched profiles need complete birth details.');
  const inputA = providerInput(profileA, birthA), inputB = providerInput(profileB, birthB);
  const brideProfile = profileA.gender === 'female' ? profileA : profileB;
  const groomProfile = profileA.gender === 'male' ? profileA : profileB;
  const brideBirth = profileA.gender === 'female' ? inputA : inputB;
  const groomBirth = profileA.gender === 'male' ? inputA : inputB;
  const [brideChart, groomChart] = await Promise.all([
    cachedOrCalculate(String(brideProfile.userId), brideBirth), cachedOrCalculate(String(groomProfile.userId), groomBirth),
  ]);
  const pairHash = hashKundliData({
    brideId: String(brideProfile.userId), brideHash: brideChart.inputHash,
    groomId: String(groomProfile.userId), groomHash: groomChart.inputHash,
    settings: ASTROLOGY_SETTINGS,
  });
  let normalizedData: Record<string, any>;
  let calculationMetadata: Record<string, unknown>;
  const cachedReport = await KundliMatchReport.findOne({ pairHash });
  if (cachedReport) {
    normalizedData = decryptKundliData(cachedReport.normalizedData);
    calculationMetadata = { provider: cachedReport.provider, providerVersion: cachedReport.providerVersion, calculatedAt: cachedReport.calculatedAt, settings: cachedReport.settings };
  } else {
    const match = await calculateCompatibility(brideBirth, groomBirth);
    const brideChartData = publicChart(brideChart.normalizedData);
    const groomChartData = publicChart(groomChart.normalizedData);
    const family = familyCompatibility(brideProfile, groomProfile);
    normalizedData = {
      overall_score: match.normalizedData.overallScore,
      ashtakoot: match.normalizedData.ashtakoot,
      dosha: {
        manglik: match.normalizedData.dosha?.manglik ?? null,
        nadi: match.normalizedData.dosha?.nadi ?? null,
        bhakoot: match.normalizedData.dosha?.bhakoot ?? null,
        rajju: match.normalizedData.dosha?.rajju ?? { status: 'not_evaluated' },
        vedha: match.normalizedData.dosha?.vedha ?? { status: 'not_evaluated' },
      },
      person_a: { name: brideProfile.displayName, gender: brideProfile.gender, ...brideChartData },
      person_b: { name: groomProfile.displayName, gender: groomProfile.gender, ...groomChartData },
      regional_compatibility: match.normalizedData.regionalPorutham,
      family_compatibility: family,
      overall_compatibility: {
        astrological: match.normalizedData.overallScore,
        family_lineage: family.status,
        kulbandhan: family.status === 'review_required' ? 'family_review_required' : 'not_assessed',
      },
      disclaimer: 'Astrology and family checks are informational. They do not predict outcomes or decide whether a relationship should proceed.',
    };
    const report = {
      users: [brideProfile.userId, groomProfile.userId], pairHash, provider: match.provider,
      providerVersion: match.providerVersion, settings: match.settings,
      rawResponse: encryptKundliData({
        compatibility: match.rawResponse,
        brideKundli: brideChart.rawResponse,
        groomKundli: groomChart.rawResponse,
      }),
      normalizedData: encryptKundliData(normalizedData), calculatedAt: new Date(),
    };
    try { await KundliMatchReport.create(report); }
    catch (error: any) { if (error.code !== 11000) throw error; }
    const saved = await KundliMatchReport.findOne({ pairHash });
    if (saved) {
      normalizedData = decryptKundliData(saved.normalizedData);
      calculationMetadata = { provider: saved.provider, providerVersion: saved.providerVersion, calculatedAt: saved.calculatedAt, settings: saved.settings };
    } else calculationMetadata = { provider: match.provider, providerVersion: match.providerVersion, calculatedAt: report.calculatedAt, settings: match.settings };
  }

  res.json({ success: true, data: { with: profileB.displayName, calculation: calculationMetadata!, ...normalizedData } });
}
