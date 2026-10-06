import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { Report, Block } from '../models/Safety';
import { AppError } from '../utils/errors';

const uid = (req: Request) => req.auth!.userId;
const oid = (s: string) => { if (!Types.ObjectId.isValid(s)) throw new AppError(400, 'BAD_ID', 'Invalid id.'); return new Types.ObjectId(s); };

export async function createReport(req: Request, res: Response) {
  const d = z.object({
    reportedUserId: z.string(), reason: z.enum(['fake_profile', 'harassment', 'scam', 'inappropriate_content', 'impersonation', 'spam', 'misrepresentation', 'other']),
    details: z.string().max(1000).optional(),
  }).parse(req.body);
  await Report.create({ reporter: uid(req), reported: oid(d.reportedUserId), reason: d.reason, details: d.details });
  res.status(201).json({ success: true, message: 'Report submitted. Our safety team will review it.' });
}

export async function createBlock(req: Request, res: Response) {
  const { userId } = z.object({ userId: z.string() }).parse(req.body);
  try { await Block.create({ blocker: uid(req), blocked: oid(userId) }); }
  catch (e: any) { if (e.code !== 11000) throw e; } // already blocked: idempotent
  res.status(201).json({ success: true, message: 'User blocked.' });
}

export async function removeBlock(req: Request, res: Response) {
  await Block.deleteOne({ blocker: uid(req), blocked: oid(req.params.userId) });
  res.json({ success: true, message: 'User unblocked.' });
}

export async function listBlocks(req: Request, res: Response) {
  const blocked = await Block.find({ blocker: uid(req) }).distinct('blocked');
  res.json({ success: true, data: { blockedUserIds: blocked.map(String) } });
}
