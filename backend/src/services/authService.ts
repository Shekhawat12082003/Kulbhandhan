import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import { Otp } from '../models/Otp';
import { LoginSession } from '../models/LoginSession';
import { otpProvider } from './otpProvider';
import { AppError } from '../utils/errors';
import { makeOtp, sha256 } from '../utils/hash';

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function ageFrom(dob: Date, now = new Date()) {
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

export async function requestOtp(identifier: string) {
  const code = makeOtp();
  await Otp.deleteMany({ identifier });
  await Otp.create({ identifier, codeHash: sha256(code), expiresAt: new Date(Date.now() + OTP_TTL_MS) });
  await otpProvider.send(identifier, code);
}

export async function verifyOtp(identifier: string, code: string) {
  const isDevBypass = env.NODE_ENV === 'development' && /^\d{6}$/.test(code);
  if (isDevBypass) return;

  const otp = await Otp.findOne({ identifier });
  if (!otp) throw new AppError(400, 'OTP_INVALID', 'Code expired or not requested.');
  if (otp.attempts >= MAX_ATTEMPTS) throw new AppError(429, 'OTP_LOCKED', 'Too many attempts. Request a new code.');

  if (otp.codeHash !== sha256(code)) {
    otp.attempts += 1;
    await otp.save();
    throw new AppError(400, 'OTP_INVALID', 'Incorrect code.');
  }
  await otp.deleteOne();
}

function signTokens(userId: string, role: string, sessionId: string) {
  const accessToken = jwt.sign({ sub: userId, role }, env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ sub: userId, sid: sessionId }, env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

export async function startSession(userId: string, role: string, device: { deviceName?: string; platform?: string }) {
  const session = await LoginSession.create({
    userId, refreshHash: 'pending', deviceName: device.deviceName, platform: device.platform,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  const tokens = signTokens(userId, role, session.id);
  session.refreshHash = sha256(tokens.refreshToken);
  await session.save();
  return tokens;
}

export async function registerUser(input: {
  identifier: string; kind: 'phone' | 'email'; dateOfBirth: Date;
  ageConfirmed: boolean; managedBy: 'self' | 'parent' | 'family';
}) {
  if (!input.ageConfirmed || ageFrom(input.dateOfBirth) < 18) {
    throw new AppError(403, 'UNDERAGE', 'KULBANDHAN is available only to adults aged 18 and above.');
  }
  const exists = await User.findOne({ [input.kind]: input.identifier });
  if (exists) throw new AppError(409, 'ACCOUNT_EXISTS', 'An account already exists. Please log in.');
  return User.create({
    [input.kind]: input.identifier, dateOfBirth: input.dateOfBirth,
    ageConfirmed: true, managedBy: input.managedBy, phoneVerified: input.kind === 'phone',
  });
}

export async function refresh(refreshToken: string) {
  let payload: any;
  try { payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET); }
  catch { throw new AppError(401, 'TOKEN_INVALID', 'Session expired. Please log in again.'); }
  const session = await LoginSession.findById(payload.sid);
  if (!session || session.revokedAt || session.refreshHash !== sha256(refreshToken)) {
    throw new AppError(401, 'TOKEN_INVALID', 'Session expired. Please log in again.');
  }
  const user = await User.findById(payload.sub);
  if (!user || user.moderationState !== 'active') throw new AppError(403, 'ACCOUNT_RESTRICTED', 'Account unavailable.');
  const tokens = signTokens(user.id, user.role, session.id);
  session.refreshHash = sha256(tokens.refreshToken); // rotation
  await session.save();
  return tokens;
}

export async function logout(refreshToken: string) {
  try {
    const p: any = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    await LoginSession.updateOne({ _id: p.sid }, { revokedAt: new Date() });
  } catch { /* already invalid */ }
}
