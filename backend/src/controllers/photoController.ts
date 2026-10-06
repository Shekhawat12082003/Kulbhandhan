import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { Photo, PhotoAccessRequest } from '../models/Photo';
import { imageStore } from '../services/cloudinary';
import { accessLevel } from '../services/matrimony';
import { AppError } from '../utils/errors';

const uid = (req: Request) => req.auth!.userId;
const oid = (s: string) => { if (!Types.ObjectId.isValid(s)) throw new AppError(400, 'BAD_ID', 'Invalid id.'); return new Types.ObjectId(s); };
const MAX_BYTES = 2 * 1024 * 1024;
const okMime = ['image/jpeg', 'image/png', 'image/webp'];

const uploadSchema = z.object({
  dataUri: z.string().min(20), mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  visibility: z.enum(['public', 'private']).default('public'),
});

export async function upload(req: Request, res: Response) {
  const d = uploadSchema.parse(req.body);
  if (!d.dataUri.startsWith(`data:${d.mimeType};base64,`)) throw new AppError(400, 'BAD_IMAGE', 'Invalid image data.');
  const b64 = d.dataUri.split(',')[1] ?? '';
  if (Buffer.byteLength(b64, 'base64') > MAX_BYTES) throw new AppError(413, 'FILE_TOO_LARGE', 'Photo must be under 2MB.');
  const count = await Photo.countDocuments({ userId: uid(req) });
  if (count >= 6) throw new AppError(409, 'PHOTO_LIMIT', 'You can upload up to 6 photos.');
  const up = await imageStore.upload(d.dataUri, `kulbandhan/${uid(req)}`);
  const photo = await Photo.create({ userId: uid(req), url: up.url, publicId: up.publicId, visibility: d.visibility, order: count, isMock: up.isMock });
  res.status(201).json({ success: true, data: { photo: { id: photo.id, url: photo.url, visibility: photo.visibility, isMock: photo.isMock } } });
}

export async function listMine(req: Request, res: Response) {
  const photos = await Photo.find({ userId: uid(req) }).sort({ order: 1 });
  const pending = await PhotoAccessRequest.find({ owner: uid(req), status: 'pending' }).populate('requester', 'phone email');
  res.json({ success: true, data: {
    photos: photos.map((p) => ({ id: p.id, url: p.url, visibility: p.visibility, isMock: p.isMock })),
    pendingRequests: pending.map((r) => ({ id: r.id, requesterId: String(r.requester) })),
  } });
}

export async function remove(req: Request, res: Response) {
  const photo = await Photo.findOne({ _id: oid(req.params.id), userId: uid(req) });
  if (!photo) throw new AppError(404, 'PHOTO_NOT_FOUND', 'Photo not found.');
  if (photo.publicId) await imageStore.destroy(photo.publicId);
  await photo.deleteOne();
  res.json({ success: true, message: 'Photo removed.' });
}

export async function setVisibility(req: Request, res: Response) {
  const { visibility } = z.object({ visibility: z.enum(['public', 'private']) }).parse(req.body);
  const photo = await Photo.findOneAndUpdate({ _id: oid(req.params.id), userId: uid(req) }, { visibility }, { new: true });
  if (!photo) throw new AppError(404, 'PHOTO_NOT_FOUND', 'Photo not found.');
  res.json({ success: true, data: { photo: { id: photo.id, visibility: photo.visibility } } });
}

export async function photosOf(req: Request, res: Response) {
  const owner = oid(req.params.userId);
  const level = await accessLevel(uid(req), String(owner));
  const canSeePrivate = level === 'self' || !!(await PhotoAccessRequest.exists({ requester: oid(uid(req)), owner, status: 'allowed' }));
  const photos = await Photo.find({ userId: owner }).sort({ order: 1 });
  const myRequest = level === 'self' ? null : await PhotoAccessRequest.findOne({ requester: oid(uid(req)), owner });
  res.json({ success: true, data: {
    photos: photos.map((p) => p.visibility === 'public' || canSeePrivate
      ? { id: p.id, url: p.url, visibility: p.visibility, locked: false, isMock: p.isMock }
      : { id: p.id, url: null, visibility: 'private', locked: true }),
    accessStatus: canSeePrivate ? 'allowed' : (myRequest?.status ?? 'none'),
  } });
}

export async function requestAccess(req: Request, res: Response) {
  const owner = oid(req.params.userId);
  if (String(owner) === uid(req)) throw new AppError(400, 'SELF', 'Cannot request your own photos.');
  try { await PhotoAccessRequest.create({ requester: uid(req), owner }); }
  catch (e: any) { if (e.code === 11000) throw new AppError(409, 'ALREADY_REQUESTED', 'You already requested access.'); throw e; }
  res.status(201).json({ success: true, data: { status: 'pending' } });
}

export async function respondAccess(req: Request, res: Response) {
  const { action } = z.object({ action: z.enum(['allow', 'reject']) }).parse(req.body);
  const r = await PhotoAccessRequest.findOne({ _id: oid(req.params.id), owner: uid(req) });
  if (!r || r.status !== 'pending') throw new AppError(404, 'REQUEST_NOT_FOUND', 'Request not found.');
  r.status = action === 'allow' ? 'allowed' : 'rejected'; await r.save();
  res.json({ success: true, data: { status: r.status } });
}
