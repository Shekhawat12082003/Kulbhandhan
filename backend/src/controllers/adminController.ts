import { Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { Report } from '../models/Safety';
import { VerificationRequest } from '../models/Verification';
import { AuditLog, audit } from '../models/AuditLog';
import { AppError } from '../utils/errors';

const admin = (req: Request) => req.auth!.userId;
const oid = (s: string) => { if (!Types.ObjectId.isValid(s)) throw new AppError(400, 'BAD_ID', 'Invalid id.'); return new Types.ObjectId(s); };

export async function dashboard(_req: Request, res: Response) {
  const [users, openReports, pendingVerifications, suspended] = await Promise.all([
    User.countDocuments(), Report.countDocuments({ status: 'open' }),
    VerificationRequest.countDocuments({ status: 'pending' }), User.countDocuments({ moderationState: { $in: ['suspended', 'banned'] } }),
  ]);
  res.json({ success: true, data: { users, openReports, pendingVerifications, suspended } });
}

export async function listReports(req: Request, res: Response) {
  const status = z.enum(['open', 'reviewed', 'actioned', 'dismissed']).optional().parse(req.query.status);
  const reports = await Report.find(status ? { status } : {}).sort({ createdAt: -1 }).limit(100)
    .populate('reporter', 'phone email').populate('reported', 'phone email moderationState');
  res.json({ success: true, data: { reports } });
}

export async function actOnReport(req: Request, res: Response) {
  const { action } = z.object({ action: z.enum(['dismiss', 'suspend_reported', 'ban_reported']) }).parse(req.body);
  const report = await Report.findById(oid(req.params.id));
  if (!report) throw new AppError(404, 'REPORT_NOT_FOUND', 'Report not found.');
  if (action === 'dismiss') { report.status = 'dismissed'; await report.save(); }
  else {
    const state = action === 'ban_reported' ? 'banned' : 'suspended';
    await User.updateOne({ _id: report.reported }, { moderationState: state });
    report.status = 'actioned'; await report.save();
    await audit(admin(req), `user.${state}`, 'user', String(report.reported), `via report ${report.id}`);
  }
  res.json({ success: true, data: { status: report.status } });
}

export async function listVerifications(req: Request, res: Response) {
  const status = z.enum(['pending', 'approved', 'rejected']).default('pending').parse(req.query.status);
  const list = await VerificationRequest.find({ status }).sort({ createdAt: 1 }).limit(100).populate('userId', 'phone email');
  res.json({ success: true, data: { requests: list } });
}

export async function reviewVerification(req: Request, res: Response) {
  const { action, note } = z.object({ action: z.enum(['approve', 'reject']), note: z.string().max(500).optional() }).parse(req.body);
  const v = await VerificationRequest.findById(oid(req.params.id));
  if (!v) throw new AppError(404, 'REQUEST_NOT_FOUND', 'Request not found.');
  v.status = action === 'approve' ? 'approved' : 'rejected'; v.reviewedBy = oid(admin(req)); v.reviewNote = note;
  await v.save();
  await audit(admin(req), `verification.${v.status}`, 'verification', v.id, v.type);
  res.json({ success: true, data: { status: v.status } });
}

export async function listUsers(req: Request, res: Response) {
  const q = z.object({ q: z.string().max(100).optional(), page: z.coerce.number().min(1).default(1) }).parse(req.query);
  const filter = q.q ? { $or: [{ email: new RegExp(q.q, 'i') }, { phone: new RegExp(q.q, 'i') }] } : {};
  const users = await User.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * 25).limit(25).select('phone email role moderationState createdAt');
  res.json({ success: true, data: { users } });
}

export async function setModerationState(req: Request, res: Response) {
  const { state } = z.object({ state: z.enum(['active', 'under_review', 'restricted', 'suspended', 'banned']) }).parse(req.body);
  const target = oid(req.params.userId);
  const user = await User.findById(target);
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
  if (['ADMIN', 'SUPER_ADMIN'].includes(user.role) && String(target) !== admin(req)) throw new AppError(403, 'FORBIDDEN', 'Cannot moderate another admin.');
  user.moderationState = state; await user.save();
  await audit(admin(req), `user.moderation.${state}`, 'user', String(target));
  res.json({ success: true, data: { moderationState: user.moderationState } });
}

export async function auditLogs(_req: Request, res: Response) {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200).populate('adminId', 'phone email');
  res.json({ success: true, data: { logs } });
}
