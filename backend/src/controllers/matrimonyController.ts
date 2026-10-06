import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { Interest, Match, Message } from '../models/Interest';
import { classifyMessage } from '../ai/safety';
import { accessLevel, project } from '../services/matrimony';
import { paidLevel, badgesFor } from '../services/matrimonyExtra';
import { ageFrom } from '../services/authService';
import { AppError } from '../utils/errors';
import { Block } from '../models/Safety';
import { Photo } from '../models/Photo';
import { saveBirthDetails, getBirthDetails } from '../services/astrology/birthData';

const uid = (req: Request) => req.auth!.userId;
const oid = (s: string) => { if (!Types.ObjectId.isValid(s)) throw new AppError(400, 'BAD_ID', 'Invalid id.'); return new Types.ObjectId(s); };
const str = z.string().trim().max(200).optional();

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(60), gender: z.enum(['male', 'female']),
  heightCm: z.coerce.number().min(120).max(230).optional(),
  city: str, state: str, education: str, profession: str, about: z.string().trim().max(800).optional(),
  family: z.object({ intro: str, type: str, values: str }).optional(),
  heritage: z.object({ kul: str, vansh: str, gotra: str, nativePlace: str }).optional(),
  lineage: z.object({ paternal: str, maternal: str }).optional(),
  kundli: z.object({
    birthTime: z.string().trim().regex(/^\d{1,2}:\d{2}(?::\d{2})?$/).optional(),
    birthPlace: str, city: str, state: str, country: str,
    latitude: z.coerce.number().min(-90).max(90).optional(), longitude: z.coerce.number().min(-180).max(180).optional(),
    timezone: z.string().trim().max(80).optional(), utcOffsetHours: z.coerce.number().min(-14).max(14).optional(),
  }).optional(),
  prefs: z.object({ ageMin: z.coerce.number().min(18).optional(), ageMax: z.coerce.number().max(80).optional(), cities: z.array(z.string().max(60)).max(10).optional() }).optional(),
});

export async function getMine(req: Request, res: Response) {
  const p = await Profile.findOne({ userId: uid(req) });
  const birthDetails = p ? await getBirthDetails(uid(req)) : null;
  res.json({ success: true, data: { profile: p ? { ...project(p, 'self'), published: p.published, birthDetails } : null } });
}

export async function setVisibility(req: Request, res: Response) {
  const { published } = z.object({ published: z.boolean() }).parse(req.body);
  const profile = await Profile.findOneAndUpdate({ userId: uid(req) }, { $set: { published } }, { new: true });
  if (!profile) throw new AppError(404, 'PROFILE_REQUIRED', 'Create your profile before changing its visibility.');
  res.json({ success: true, data: { published: profile.published } });
}

export async function saveMine(req: Request, res: Response) {
  const d = profileSchema.parse(req.body);
  const user = await User.findById(uid(req));
  if (!user || ageFrom(user.dateOfBirth) < 18) throw new AppError(403, 'UNDERAGE', 'Adults only.');

  const prev = await Profile.findOne({ userId: user._id });
  const { kundli, ...profileData } = d;
  const hasBirthInput = !!kundli && Object.values(kundli).some((value) => value !== undefined && value !== '');
  const unsetBirthFields = hasBirthInput ? Object.fromEntries(
    ['birthTime', 'birthPlace', 'birthCity', 'birthState', 'birthCountry', 'birthLatitude', 'birthLongitude', 'birthTimezone', 'utcOffsetHours']
      .map((key) => [`kundli.${key}`, 1]),
  ) : undefined;
  const set: Record<string, unknown> = {
    ...profileData,
    userId: user._id,
    dateOfBirth: user.dateOfBirth,
    published: prev?.published ?? true,
  };

  if (d.family) {
    set['family.intro'] = d.family.intro;
    set['family.type'] = d.family.type;
    set['family.values'] = d.family.values;
    delete set.family;
  }
  if (d.heritage) {
    set['heritage.kul'] = d.heritage.kul;
    set['heritage.vansh'] = d.heritage.vansh;
    set['heritage.gotra'] = d.heritage.gotra;
    set['heritage.nativePlace'] = d.heritage.nativePlace;
    delete set.heritage;
  }
  if (d.lineage) {
    set['lineage.paternal'] = d.lineage.paternal;
    set['lineage.maternal'] = d.lineage.maternal;
    delete set.lineage;
  }
  if (kundli && hasBirthInput) {
    await saveBirthDetails(String(user._id), {
      birthTime: kundli.birthTime, birthPlace: kundli.birthPlace, city: kundli.city, state: kundli.state, country: kundli.country,
      latitude: kundli.latitude, longitude: kundli.longitude, timezone: kundli.timezone, utcOffsetHours: kundli.utcOffsetHours,
    });
  }
  if (d.prefs) {
    set['prefs.ageMin'] = d.prefs.ageMin;
    set['prefs.ageMax'] = d.prefs.ageMax;
    delete set.prefs;
  }

  const p = await Profile.findOneAndUpdate({ userId: user._id },
    { $set: set, ...(unsetBirthFields ? { $unset: unsetBirthFields } : {}) },
    { upsert: true, new: true, setDefaultsOnInsert: true });
  await User.updateOne({ _id: user._id }, { onboardingStep: 15 });
  const birthDetails = await getBirthDetails(String(user._id));
  res.json({ success: true, data: { profile: { ...project(p, 'self'), published: p.published, birthDetails } } });
}

export async function discover(req: Request, res: Response) {
  const me = await Profile.findOne({ userId: uid(req) });
  if (!me) throw new AppError(409, 'PROFILE_REQUIRED', 'Complete your profile first.');
  const q = z.object({ ageMin: z.coerce.number().min(18).default(18), ageMax: z.coerce.number().max(80).default(60),
    city: z.string().trim().max(60).optional(), education: z.string().trim().max(60).optional(),
    page: z.coerce.number().min(1).default(1) }).parse(req.query);
  const now = new Date();
  const born = (age: number) => new Date(now.getFullYear() - age, now.getMonth(), now.getDate());
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hidden = await Interest.find({ from: me.userId, status: { $in: ['declined', 'blocked'] } }).distinct('to');
  const blockedPairs = await Block.find({ $or: [{ blocker: me.userId }, { blocked: me.userId }] });
  const blockedIds = blockedPairs.map((b) => (String(b.blocker) === String(me.userId) ? b.blocked : b.blocker));
  hidden.push(...blockedIds);
  const filter: any = { published: true, userId: { $nin: [me.userId, ...hidden] }, gender: me.gender === 'male' ? 'female' : 'male',
    dateOfBirth: { $lte: born(q.ageMin), $gte: born(q.ageMax + 1) } };
  if (q.city) filter.city = new RegExp(`^${esc(q.city)}$`, 'i');
  if (q.education) filter.education = new RegExp(esc(q.education), 'i');
  const users = await User.find({ moderationState: 'active' }).distinct('_id');
  filter.userId.$in = users;
  const list = await Profile.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * 20).limit(20);
  const userIds = list.map((p) => String(p.userId));
  const [badges, photos] = await Promise.all([
    badgesFor(userIds),
    Photo.find({ userId: { $in: userIds }, visibility: 'public' }).sort({ order: 1, createdAt: 1 }).select('userId url').lean(),
  ]);
  const photoByUser = new Map<string, string>();
  for (const photo of photos) if (!photoByUser.has(String(photo.userId))) photoByUser.set(String(photo.userId), photo.url);
  res.json({ success: true, data: { profiles: list.map((p) => ({
    ...project(p, 'basic'), photoUrl: photoByUser.get(String(p.userId)) ?? null,
    badges: badges.get(String(p.userId)) ?? [],
  })), page: q.page } });
}

export async function viewProfile(req: Request, res: Response) {
  const p = await Profile.findOne({ userId: oid(req.params.userId), published: true });
  if (!p) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Profile not found.');
  let level = await accessLevel(uid(req), String(p.userId));
  level = await paidLevel(uid(req), String(p.userId), level);
  const rel = level === 'self' ? null : await Interest.findOne({ $or: [{ from: uid(req), to: p.userId }, { from: p.userId, to: uid(req) }] });
  const badges = (await badgesFor([String(p.userId)])).get(String(p.userId)) ?? [];
  res.json({ success: true, data: { profile: { ...project(p, level), badges },
    interest: rel ? { id: rel.id, status: rel.status, direction: String(rel.from) === uid(req) ? 'sent' : 'received' } : null } });
}

export async function sendInterest(req: Request, res: Response) {
  const to = oid(z.object({ toUserId: z.string() }).parse(req.body).toUserId);
  const from = oid(uid(req));
  if (to.equals(from)) throw new AppError(400, 'SELF_INTEREST', 'You cannot send interest to yourself.');
  if (!(await Profile.exists({ userId: to, published: true }))) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Profile not found.');
  const reverse = await Interest.findOne({ from: to, to: from, status: 'pending' });
  if (reverse) { // they already showed interest: mutual, create match
    reverse.status = 'accepted'; await reverse.save();
    const match = await Match.create({ users: [from, to] });
    return res.json({ success: true, data: { status: 'matched', matchId: match.id } });
  }
  try { await Interest.create({ from, to }); }
  catch (e: any) { if (e.code === 11000) throw new AppError(409, 'DUPLICATE_INTEREST', 'You have already sent interest.'); throw e; }
  res.status(201).json({ success: true, data: { status: 'pending' } });
}

export async function listInterests(req: Request, res: Response) {
  const box = z.enum(['received', 'sent']).default('received').parse(req.query.box);
  const f = box === 'received' ? { to: uid(req), status: 'pending' } : { from: uid(req) };
  const items = await Interest.find(f).sort({ createdAt: -1 }).limit(50);
  const other = (i: any) => (box === 'received' ? i.from : i.to);
  const profiles = await Profile.find({ userId: { $in: items.map(other) } });
  const byUser = new Map(profiles.map((p) => [String(p.userId), p]));
  res.json({ success: true, data: { interests: items.filter((i) => byUser.has(String(other(i)))).map((i) => ({
    id: i.id, status: i.status, createdAt: i.createdAt, profile: project(byUser.get(String(other(i))), 'basic') })) } });
}

export async function respond(req: Request, res: Response) {
  const { action } = z.object({ action: z.enum(['accept', 'decline']) }).parse(req.body);
  const i = await Interest.findOne({ _id: oid(req.params.id), to: uid(req) }); // only the recipient
  if (!i || i.status !== 'pending') throw new AppError(404, 'INTEREST_NOT_FOUND', 'Request not found.');
  i.status = action === 'accept' ? 'accepted' : 'declined'; await i.save();
  if (action === 'decline') return res.json({ success: true, data: { status: 'declined' } });
  const match = await Match.create({ users: [i.from, i.to] });
  res.json({ success: true, data: { status: 'matched', matchId: match.id } });
}

export async function listMatches(req: Request, res: Response) {
  const ms = await Match.find({ users: oid(uid(req)) }).sort({ updatedAt: -1 });
  const ids = ms.map((m) => m.users.find((u) => String(u) !== uid(req))!);
  const profiles = await Profile.find({ userId: { $in: ids } });
  const by = new Map(profiles.map((p) => [String(p.userId), p]));
  res.json({ success: true, data: { matches: ms.map((m, k) => ({ id: m.id, profile: by.get(String(ids[k])) ? project(by.get(String(ids[k])), 'matched') : null })) } });
}

async function ownMatch(req: Request) {
  const m = await Match.findOne({ _id: oid(req.params.matchId), users: oid(uid(req)) }); // chat only after mutual match
  if (!m) throw new AppError(404, 'MATCH_NOT_FOUND', 'Conversation not found.');
  return m;
}

export async function getMessages(req: Request, res: Response) {
  const m = await ownMatch(req);
  const msgs = await Message.find({ matchId: m._id }).sort({ createdAt: -1 }).limit(100);
  await Message.updateMany({ matchId: m._id, senderId: { $ne: oid(uid(req)) }, seenAt: null }, { seenAt: new Date() });
  res.json({ success: true, data: { messages: msgs.reverse().map((x) => ({ id: x.id, mine: String(x.senderId) === uid(req), text: x.text, at: x.createdAt, seen: !!x.seenAt })) } });
}

export async function sendMessage(req: Request, res: Response) {
  const m = await ownMatch(req);
  const other = m.users.find((u) => String(u) !== uid(req))!;
  if (await Block.exists({ $or: [{ blocker: uid(req), blocked: other }, { blocker: other, blocked: uid(req) }] })) throw new AppError(403, 'BLOCKED', 'You cannot message this user.');
  const { text } = z.object({ text: z.string().trim().min(1).max(2000) }).parse(req.body);
  const x = await Message.create({ matchId: m._id, senderId: uid(req), text }); // sender from token, never from client
  await Match.updateOne({ _id: m._id }, { updatedAt: new Date() });
  res.status(201).json({ success: true, data: { id: x.id, flag: classifyMessage(text) } });
}
