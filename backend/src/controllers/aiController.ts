import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { Profile } from '../models/Profile';
import { interpretSearch } from '../ai/search';
import { explainMatch } from '../ai/matchExplain';
import { assistProfileText } from '../ai/profileAssistant';
import { AppError } from '../utils/errors';

const uid = (req: Request) => req.auth!.userId;
const oid = (s: string) => { if (!Types.ObjectId.isValid(s)) throw new AppError(400, 'BAD_ID', 'Invalid id.'); return new Types.ObjectId(s); };

export async function search(req: Request, res: Response) {
  const { query } = z.object({ query: z.string().trim().min(3).max(300) }).parse(req.body);
  const { filters, source } = await interpretSearch(query);
  res.json({ success: true, data: { filters, source, note: source === 'rules' ? 'Interpreted using simple keyword rules (AI search not configured).' : null } });
}

export async function matchExplanation(req: Request, res: Response) {
  const other = oid(req.params.userId);
  const [me, them] = await Promise.all([Profile.findOne({ userId: uid(req) }), Profile.findOne({ userId: other, published: true })]);
  if (!me || !them) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Profile not found.');
  res.json({ success: true, data: explainMatch(me, them) });
}

export async function profileAssist(req: Request, res: Response) {
  const { field, facts } = z.object({ field: z.enum(['about', 'familyIntro', 'partnerExpectations', 'professional']), facts: z.string().max(1000) }).parse(req.body);
  const result = await assistProfileText(field, facts);
  res.json({ success: true, data: result });
}
