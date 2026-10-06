import { Schema, model } from 'mongoose';

const reportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reported: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: { type: String, enum: ['fake_profile', 'harassment', 'scam', 'inappropriate_content', 'impersonation', 'spam', 'misrepresentation', 'other'], required: true },
    details: { type: String, maxlength: 1000 },
    status: { type: String, enum: ['open', 'reviewed', 'actioned', 'dismissed'], default: 'open', index: true },
  },
  { timestamps: true }
);
export const Report = model('Report', reportSchema);

const blockSchema = new Schema(
  { blocker: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, blocked: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true } },
  { timestamps: true }
);
blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
export const Block = model('Block', blockSchema);
