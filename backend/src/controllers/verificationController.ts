import { Request, Response } from 'express';
import { z } from 'zod';
import { VerificationRequest } from '../models/Verification';
import { User } from '../models/User';
import { AppError } from '../utils/errors';

const uid = (req: Request) => req.auth!.userId;

const BADGE_MEANING: Record<string, string> = {
  phone: 'The phone number or email was confirmed with a one-time code.',
  photo: "A photo was matched against the profile's photos by an admin reviewer (liveness check).",
  identity: 'A government ID was reviewed by an admin reviewer.',
  education: 'The stated education was reviewed by an admin reviewer.',
  family: 'A family member or reference was reviewed by an admin reviewer.',
};

export async function requestVerification(req: Request, res: Response) {
  const { type, note } = z.object({ type: z.enum(['photo', 'identity', 'education', 'family']), note: z.string().max(500).optional() }).parse(req.body);
  const existing = await VerificationRequest.findOne({ userId: uid(req), type });
  if (existing && existing.status !== 'rejected') throw new AppError(409, 'ALREADY_REQUESTED', 'A request of this type is already pending or approved.');
  const v = await VerificationRequest.findOneAndUpdate({ userId: uid(req), type }, { status: 'pending', note, reviewedBy: undefined, reviewNote: undefined }, { upsert: true, new: true });
  res.status(201).json({ success: true, data: { id: v.id, status: v.status } });
}

export async function myVerifications(req: Request, res: Response) {
  const user = await User.findById(uid(req));
  const list = await VerificationRequest.find({ userId: uid(req) });
  const badges: { type: string; meaning: string }[] = list.filter((v) => v.status === 'approved').map((v) => ({ type: v.type, meaning: BADGE_MEANING[v.type] }));
  if (user?.phoneVerified) badges.unshift({ type: 'phone', meaning: BADGE_MEANING.phone });
  res.json({ success: true, data: { requests: list.map((v) => ({ type: v.type, status: v.status, reviewNote: v.reviewNote })), badges } });
}
