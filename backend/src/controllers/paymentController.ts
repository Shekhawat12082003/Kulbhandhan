import { Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { PaymentOrder, ProfileUnlock, Subscription } from '../models/Payment';
import { CATALOG, Product } from '../payments/catalog';
import { razorpay } from '../payments/razorpay';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

const uid = (req: Request) => req.auth!.userId;

export async function createOrder(req: Request, res: Response) {
  const { product, targetUserId } = z.object({ product: z.enum(['premium_1m', 'premium_3m', 'profile_unlock']), targetUserId: z.string().optional() }).parse(req.body);
  if (product !== 'profile_unlock') throw new AppError(503, 'PREMIUM_UNAVAILABLE', 'Premium subscriptions are unavailable until their benefits are implemented.');
  if (env.NODE_ENV === 'production' || String(env.RAZORPAY_PROVIDER) === 'live') {
    throw new AppError(503, 'CHECKOUT_UNAVAILABLE', 'Payments are unavailable until in-app checkout is configured. No payment has been taken.');
  }
  if (product === 'profile_unlock') {
    if (!targetUserId || !Types.ObjectId.isValid(targetUserId)) throw new AppError(400, 'BAD_ID', 'targetUserId is required.');
    if (await ProfileUnlock.exists({ userId: uid(req), targetUserId })) throw new AppError(409, 'ALREADY_UNLOCKED', 'You already unlocked this profile.');
  }
  const item = CATALOG[product as Product];
  const order = await PaymentOrder.create({
    userId: uid(req), product, targetUserId: product === 'profile_unlock' ? targetUserId : undefined,
    amountPaise: item.amountPaise, razorpayOrderId: '' , status: 'created',
  });
  const rp = await razorpay.createOrder(item.amountPaise, 'INR', order.id);
  order.razorpayOrderId = rp.id; await order.save();
  res.status(201).json({ success: true, data: {
    orderId: order.id, razorpayOrderId: rp.id, amountPaise: item.amountPaise, currency: 'INR',
    keyId: env.RAZORPAY_KEY_ID ?? null, product, label: item.label,
    mock: env.RAZORPAY_PROVIDER !== 'live',
  } });
}

async function fulfil(order: any) {
  if (order.status === 'paid') return;
  order.status = 'paid'; await order.save();
  if (order.product === 'profile_unlock') {
    await ProfileUnlock.updateOne({ userId: order.userId, targetUserId: order.targetUserId }, {}, { upsert: true });
  } else {
    const item = CATALOG[order.product as Product] as { amountPaise: number; label: string; days: number };
    const days = item.days;
    const existing = await Subscription.findOne({ userId: order.userId });
    const base = existing && existing.expiresAt > new Date() ? existing.expiresAt : new Date();
    const expiresAt = new Date(base.getTime() + days * 86400000);
    await Subscription.findOneAndUpdate({ userId: order.userId }, { plan: order.product, status: 'active', expiresAt }, { upsert: true });
  }
}

export async function verifyPayment(req: Request, res: Response) {
  const d = z.object({ orderId: z.string(), razorpayPaymentId: z.string(), razorpaySignature: z.string() }).parse(req.body);
  const order = await PaymentOrder.findOne({ _id: d.orderId, userId: uid(req) });
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  if (env.RAZORPAY_PROVIDER !== 'live') throw new AppError(501, 'PAYMENT_NOT_CONFIGURED', 'Live payments are not configured. Use the development confirm endpoint.');
  if (!razorpay.verifySignature(order.razorpayOrderId, d.razorpayPaymentId, d.razorpaySignature)) throw new AppError(400, 'SIGNATURE_INVALID', 'Payment could not be verified.');
  order.razorpayPaymentId = d.razorpayPaymentId; await fulfil(order);
  res.json({ success: true, data: { status: 'paid' } });
}

/** DEV-ONLY: simulates a successful webhook so the flow is testable before Razorpay keys exist. Disabled in production. */
export async function devConfirm(req: Request, res: Response) {
  if (env.NODE_ENV === 'production' || env.RAZORPAY_PROVIDER === 'live') throw new AppError(403, 'FORBIDDEN', 'Not available.');
  const { orderId } = z.object({ orderId: z.string() }).parse(req.body);
  const order = await PaymentOrder.findOne({ _id: orderId, userId: uid(req) });
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  await fulfil(order);
  res.json({ success: true, data: { status: 'paid', mock: true } });
}

export async function razorpayWebhook(req: Request, res: Response) {
  const sig = req.headers['x-razorpay-signature'] as string | undefined;
  if (!sig || !razorpay.verifyWebhookSignature((req as any).rawBody ?? '', sig)) throw new AppError(400, 'SIGNATURE_INVALID', 'Invalid webhook signature.');
  const payload = req.body;
  if (payload.event === 'payment.captured') {
    const rpOrderId = payload.payload.payment.entity.order_id;
    const order = await PaymentOrder.findOne({ razorpayOrderId: rpOrderId });
    if (order) { order.razorpayPaymentId = payload.payload.payment.entity.id; await fulfil(order); }
  }
  res.json({ success: true });
}

export async function myStatus(req: Request, res: Response) {
  const [sub, unlocks] = await Promise.all([
    Subscription.findOne({ userId: uid(req) }),
    ProfileUnlock.find({ userId: uid(req) }).distinct('targetUserId'),
  ]);
  const active = !!sub && sub.status === 'active' && sub.expiresAt > new Date();
  res.json({ success: true, data: { premium: active, expiresAt: active ? sub!.expiresAt : null, unlockedProfileIds: unlocks.map(String) } });
}
