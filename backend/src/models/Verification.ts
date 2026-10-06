import { Schema, model } from 'mongoose';

const verificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['photo', 'identity', 'education', 'family'], required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    note: { type: String, maxlength: 500 }, // what the user submitted (e.g. education details to check)
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);
verificationSchema.index({ userId: 1, type: 1 }, { unique: true });
export const VerificationRequest = model('VerificationRequest', verificationSchema);
