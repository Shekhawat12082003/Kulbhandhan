import { Request, Response } from 'express';
import * as svc from '../services/authService';
import { User } from '../models/User';
import { AppError } from '../utils/errors';
import { loginSchema, refreshSchema, registerSchema, requestOtpSchema } from '../validators/auth';

const publicUser = (u: any) => ({
  id: u.id, managedBy: u.managedBy, onboardingStep: u.onboardingStep, phoneVerified: u.phoneVerified,
});

export async function requestOtp(req: Request, res: Response) {
  const { identifier } = requestOtpSchema.parse(req.body);
  await svc.requestOtp(identifier);
  res.json({ success: true, message: 'Verification code sent.' });
}

export async function register(req: Request, res: Response) {
  const d = registerSchema.parse(req.body);
  if (svc.ageFrom(d.dateOfBirth) < 18) throw new AppError(403, 'UNDERAGE', 'KULBANDHAN is available only to adults aged 18 and above.');
  await svc.verifyOtp(d.identifier, d.code);
  const user = await svc.registerUser(d);
  const tokens = await svc.startSession(user.id, user.role, d);
  res.status(201).json({ success: true, data: { user: publicUser(user), ...tokens } });
}

export async function login(req: Request, res: Response) {
  const d = loginSchema.parse(req.body);
  await svc.verifyOtp(d.identifier, d.code);
  const user = await User.findOne({ [d.kind]: d.identifier });
  if (!user) throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'No account found. Please register.');
  if (user.moderationState !== 'active') throw new AppError(403, 'ACCOUNT_RESTRICTED', 'Account unavailable.');
  const tokens = await svc.startSession(user.id, user.role, d);
  res.json({ success: true, data: { user: publicUser(user), ...tokens } });
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = refreshSchema.parse(req.body);
  res.json({ success: true, data: await svc.refresh(refreshToken) });
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = refreshSchema.parse(req.body);
  await svc.logout(refreshToken);
  res.json({ success: true, message: 'Logged out.' });
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.auth!.userId);
  if (!user) throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Account not found.');
  res.json({ success: true, data: { user: publicUser(user) } });
}
