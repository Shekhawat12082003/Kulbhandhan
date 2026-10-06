import { Types } from 'mongoose';
import { Interest, Match } from '../models/Interest';
import { ageFrom } from './authService';

export type Level = 'self' | 'basic' | 'interest' | 'matched';

/** Server-side access level between viewer and owner. Drives every field projection. */
export async function accessLevel(viewer: string, owner: string): Promise<Level> {
  if (viewer === owner) return 'self';
  const v = new Types.ObjectId(viewer), o = new Types.ObjectId(owner);
  const { Block } = await import('../models/Safety');
  if (await Block.exists({ $or: [{ blocker: v, blocked: o }, { blocker: o, blocked: v }] })) throw new (await import('../utils/errors')).AppError(404, 'PROFILE_NOT_FOUND', 'Profile not found.');
  if (await Match.exists({ users: { $all: [v, o] } })) return 'matched';
  const i = await Interest.exists({ $or: [{ from: v, to: o }, { from: o, to: v }], status: { $in: ['pending', 'accepted'] } });
  return i ? 'interest' : 'basic';
}

/** Whitelist projection: raw documents never reach the client. */
export function project(p: any, level: Level) {
  const out: any = {
    userId: String(p.userId), displayName: p.displayName, age: ageFrom(new Date(p.dateOfBirth)),
    gender: p.gender, heightCm: p.heightCm, city: p.city, education: p.education, profession: p.profession,
    heritage: { kul: p.heritage?.kul, gotra: p.heritage?.gotra }, access: level,
    isTestData: p.isTestData,
  };
  const more = level !== 'basic';
  if (more) {
    out.about = p.about; out.heightCm = p.heightCm; out.state = p.state;
    out.family = p.family; out.heritage = { ...p.heritage?.toObject?.() ?? p.heritage };
    out.prefs = p.prefs;
  }
  if (level === 'matched' || level === 'self') {
    out.lineage = p.lineage;
  }
  return out;
}
