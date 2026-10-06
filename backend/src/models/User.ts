import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    phone: { type: String, unique: true, sparse: true, index: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, index: true },
    dateOfBirth: { type: Date, required: true },
    managedBy: { type: String, enum: ['self', 'parent', 'family'], default: 'self' },
    role: {
      type: String,
      enum: ['USER', 'FAMILY_MEMBER', 'MATCHMAKER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'],
      default: 'USER',
    },
    moderationState: {
      type: String,
      enum: ['active', 'under_review', 'restricted', 'suspended', 'banned', 'deleted'],
      default: 'active',
      index: true,
    },
    ageConfirmed: { type: Boolean, required: true },
    phoneVerified: { type: Boolean, default: false },
    onboardingStep: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const User = model('User', userSchema);
