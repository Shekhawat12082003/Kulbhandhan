import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog';
import { Interest, Match, Message } from '../models/Interest';
import { KundliBirthData, KundliMatchReport, KundliSnapshot } from '../models/Kundli';
import { LoginSession } from '../models/LoginSession';
import { Otp } from '../models/Otp';
import { PaymentOrder, ProfileUnlock, Subscription } from '../models/Payment';
import { Photo, PhotoAccessRequest } from '../models/Photo';
import { Profile } from '../models/Profile';
import { Block, Report } from '../models/Safety';
import { User } from '../models/User';
import { VerificationRequest } from '../models/Verification';
import { imageStore } from '../services/cloudinary';
import { AppError } from '../utils/errors';

const uid = (req: Request) => req.auth!.userId;
const redacted = 'Redacted after account deletion';

export async function deleteMine(req: Request, res: Response) {
  const userId = new Types.ObjectId(uid(req));
  const user = await User.findById(userId).select('phone email');
  if (!user) throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Account not found.');

  let tombstoneId: Types.ObjectId;
  do { tombstoneId = new Types.ObjectId(); } while (await User.exists({ _id: tombstoneId }));

  await Profile.updateOne({ userId }, { $set: { published: false } });
  req.app.locals.io?.in(`user:${userId}`).disconnectSockets(true);

  const photos = await Photo.find({ userId }).select('publicId');
  await Promise.all(photos.filter((photo) => photo.publicId).map((photo) => imageStore.destroy(photo.publicId!)));

  const matches = await Match.find({ users: userId }).select('_id users');
  const matchIds = matches.map((match) => match._id);
  if (matchIds.length) {
    await Message.updateMany({ matchId: { $in: matchIds } }, {
      $set: { senderId: tombstoneId, text: 'Message removed after account deletion' },
    });
    for (const match of matches) {
      match.users = match.users.map((participant) => participant.equals(userId) ? tombstoneId : participant);
      await match.save();
    }
  }

  const reports = await Report.find({ $or: [{ reporter: userId }, { reported: userId }] });
  for (const report of reports) {
    if (String(report.reporter) === String(userId)) report.reporter = tombstoneId;
    if (String(report.reported) === String(userId)) report.reported = tombstoneId;
    report.details = undefined;
    await report.save();
  }

  await AuditLog.updateMany({ adminId: userId }, { $set: { adminId: tombstoneId, details: redacted } });
  await AuditLog.updateMany({ targetId: userId }, { $set: { targetId: tombstoneId, details: redacted } });
  await VerificationRequest.updateMany({ reviewedBy: userId }, { $set: { reviewedBy: tombstoneId, reviewNote: redacted } });
  await PaymentOrder.updateMany({ userId }, { $set: { userId: tombstoneId } });
  await PaymentOrder.updateMany({ targetUserId: userId }, { $unset: { targetUserId: 1 } });

  await Promise.all([
    Profile.deleteOne({ userId }),
    Photo.deleteMany({ userId }),
    PhotoAccessRequest.deleteMany({ $or: [{ requester: userId }, { owner: userId }] }),
    VerificationRequest.deleteMany({ userId }),
    Interest.deleteMany({ $or: [{ from: userId }, { to: userId }] }),
    Block.deleteMany({ $or: [{ blocker: userId }, { blocked: userId }] }),
    ProfileUnlock.deleteMany({ $or: [{ userId }, { targetUserId: userId }] }),
    Subscription.deleteOne({ userId }),
    KundliBirthData.deleteOne({ userId }),
    KundliSnapshot.deleteMany({ userId }),
    KundliMatchReport.deleteMany({ users: userId }),
    LoginSession.deleteMany({ userId }),
    Otp.deleteMany({ identifier: { $in: [user.phone, user.email].filter((identifier): identifier is string => !!identifier) } }),
  ]);

  await User.deleteOne({ _id: userId });

  res.json({ success: true, message: 'Account and profile data deleted. Retained records were anonymized.' });
}