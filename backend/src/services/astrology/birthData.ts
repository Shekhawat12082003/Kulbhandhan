import { Types } from 'mongoose';
import { KundliBirthData, KundliMatchReport, KundliSnapshot } from '../../models/Kundli';
import { Profile } from '../../models/Profile';
import { env } from '../../config/env';
import { decryptKundliData, encryptKundliData, hashKundliData } from '../../utils/secureKundliData';
import { AppError } from '../../utils/errors';

export type BirthDetails = {
  birthTime?: string;
  birthPlace?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  utcOffsetHours?: number;
};

const legacyBirthPaths = [
  'kundli.birthTime', 'kundli.birthPlace', 'kundli.birthCity', 'kundli.birthState', 'kundli.birthCountry',
  'kundli.birthLatitude', 'kundli.birthLongitude', 'kundli.birthTimezone', 'kundli.utcOffsetHours',
];
const legacyCalculatedPaths = ['kundli.manglik', 'kundli.moonNakshatra', 'kundli.pada', 'kundli.lagna', 'kundli.source'];
const clearLegacyBirthPaths = Object.fromEntries([...legacyBirthPaths, ...legacyCalculatedPaths].map((path) => [path, 1]));

export async function saveBirthDetails(userId: string, details: BirthDetails) {
  const normalized = Object.fromEntries(Object.entries(details).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])) as BirthDetails;
  const hasDetails = Object.values(normalized).some((value) => value !== undefined && value !== '');
  if (!hasDetails) {
    await removeBirthDetails(userId);
    return null;
  }

  const inputHash = hashKundliData(normalized);
  const previous = await KundliBirthData.findOne({ userId }).select('inputHash');
  if (previous?.inputHash !== inputHash) {
    await KundliBirthData.findOneAndUpdate({ userId }, {
      $set: { inputHash, payload: encryptKundliData(normalized) },
      $setOnInsert: { userId },
    }, { upsert: true, new: true });
    await Promise.all([
      KundliSnapshot.deleteMany({ userId }),
      KundliMatchReport.deleteMany({ users: new Types.ObjectId(userId) }),
      Profile.updateOne({ userId }, { $unset: clearLegacyBirthPaths }),
    ]);
  }
  await Profile.updateOne({ userId }, { $unset: clearLegacyBirthPaths });
  return normalized;
}

export async function getBirthDetails(userId: string): Promise<BirthDetails | null> {
  const saved = await KundliBirthData.findOne({ userId });
  if (saved) return decryptKundliData<BirthDetails>(saved.payload);

  const profile = await Profile.findOne({ userId }).select('city state kundli');
  const legacy = profile?.kundli;
  if (!legacy) return null;
  const details: BirthDetails = {
    birthTime: legacy.birthTime ?? undefined,
    birthPlace: legacy.birthPlace ?? undefined,
    city: legacy.birthCity ?? undefined,
    state: legacy.birthState ?? undefined,
    country: legacy.birthCountry ?? undefined,
    latitude: legacy.birthLatitude ?? undefined,
    longitude: legacy.birthLongitude ?? undefined,
    timezone: legacy.birthTimezone ?? undefined,
    utcOffsetHours: legacy.utcOffsetHours ?? undefined,
  };
  if (!Object.values(details).some((value) => value !== undefined && value !== '')) return null;
  if (!env.KUNDLI_DATA_ENCRYPTION_KEY) return details;
  try { return await saveBirthDetails(userId, details); }
  catch (error) {
    if (error instanceof AppError && error.code === 'KUNDLI_ENCRYPTION_KEY_INVALID') return details;
    throw error;
  }
}

export async function removeBirthDetails(userId: string) {
  await Promise.all([
    KundliBirthData.deleteOne({ userId }),
    KundliSnapshot.deleteMany({ userId }),
    KundliMatchReport.deleteMany({ users: new Types.ObjectId(userId) }),
    Profile.updateOne({ userId }, { $unset: clearLegacyBirthPaths }),
  ]);
}