import { Schema, model } from 'mongoose';

const subscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true, index: true },
    plan: { type: String, enum: ['premium_1m', 'premium_3m'], required: true },
    status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active', index: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);
export const Subscription = model('Subscription', subscriptionSchema);

const unlockSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);
unlockSchema.index({ userId: 1, targetUserId: 1 }, { unique: true });
export const ProfileUnlock = model('ProfileUnlock', unlockSchema);

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: String, enum: ['premium_1m', 'premium_3m', 'profile_unlock'], required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User' }, // set only for profile_unlock
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    razorpayPaymentId: String,
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created', index: true },
  },
  { timestamps: true }
);
export const PaymentOrder = model('PaymentOrder', orderSchema);
