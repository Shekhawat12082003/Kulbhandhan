import { Schema, model } from 'mongoose';

const photoSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    url: { type: String, required: true }, // Cloudinary secure_url in production, data URI in mock mode
    publicId: String, // Cloudinary public_id, for deletion
    visibility: { type: String, enum: ['public', 'private'], default: 'public', index: true },
    order: { type: Number, default: 0 },
    isMock: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export const Photo = model('Photo', photoSchema);

const requestSchema = new Schema(
  {
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'allowed', 'rejected'], default: 'pending', index: true },
  },
  { timestamps: true }
);
requestSchema.index({ requester: 1, owner: 1 }, { unique: true });
export const PhotoAccessRequest = model('PhotoAccessRequest', requestSchema);
