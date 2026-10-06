import { Schema, model } from 'mongoose';

const otpSchema = new Schema(
  {
    identifier: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);
export const Otp = model('Otp', otpSchema);
