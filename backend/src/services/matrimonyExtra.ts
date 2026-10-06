import { ProfileUnlock } from '../models/Payment';
import { Level } from './matrimony';

/** A paid unlock (from either side) raises 'basic' access to 'interest'-equivalent detail, never above 'matched'. */
export async function paidLevel(viewer: string, owner: string, base: Level): Promise<Level> {
  if (base !== 'basic') return base;
  const unlocked = await ProfileUnlock.exists({ userId: viewer, targetUserId: owner });
  return unlocked ? 'interest' : base;
}

import { User } from '../models/User';
import { VerificationRequest } from '../models/Verification';

/** Batch-computes verification badges for a set of userIds. Each badge names exactly what was checked. */
export async function badgesFor(userIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!userIds.length) return map;
  const [users, approved] = await Promise.all([
    User.find({ _id: { $in: userIds }, phoneVerified: true }).distinct('_id'),
    VerificationRequest.find({ userId: { $in: userIds }, status: 'approved' }),
  ]);
  for (const id of userIds) map.set(id, []);
  for (const id of users) map.get(String(id))?.push('phone');
  for (const v of approved) map.get(String(v.userId))?.push(v.type);
  return map;
}
