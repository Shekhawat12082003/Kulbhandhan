import { Schema, model } from 'mongoose';

const interestSchema = new Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'withdrawn', 'expired', 'blocked'], default: 'pending', index: true },
  },
  { timestamps: true }
);
interestSchema.index({ from: 1, to: 1 }, { unique: true }); // no duplicate requests
export const Interest = model('Interest', interestSchema);

const matchSchema = new Schema(
  { users: { type: [Schema.Types.ObjectId], ref: 'User', required: true, index: true } },
  { timestamps: true }
);
matchSchema.index({ users: 1 });
export const Match = model('Match', matchSchema);

const messageSchema = new Schema(
  {
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 2000 },
    seenAt: Date,
  },
  { timestamps: true }
);
export const Message = model('Message', messageSchema);
