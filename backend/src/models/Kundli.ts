import { Schema, model } from 'mongoose';

const encryptedPayloadSchema = new Schema({
  ciphertext: { type: String, required: true },
  iv: { type: String, required: true },
  authTag: { type: String, required: true },
}, { _id: false });

const birthDataSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true, index: true },
  inputHash: { type: String, required: true, index: true },
  payload: { type: encryptedPayloadSchema, required: true },
}, { timestamps: true });

const kundliSnapshotSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  inputHash: { type: String, required: true },
  provider: { type: String, enum: ['navamsha'], required: true },
  providerVersion: { type: String, required: true },
  settings: { type: Schema.Types.Mixed, required: true },
  rawResponse: { type: encryptedPayloadSchema, required: true },
  normalizedData: { type: encryptedPayloadSchema, required: true },
  calculatedAt: { type: Date, required: true },
}, { timestamps: true });
kundliSnapshotSchema.index({ userId: 1, inputHash: 1 }, { unique: true });

const kundliMatchReportSchema = new Schema({
  users: { type: [Schema.Types.ObjectId], ref: 'User', required: true, index: true },
  pairHash: { type: String, required: true, unique: true, index: true },
  provider: { type: String, enum: ['navamsha'], required: true },
  providerVersion: { type: String, required: true },
  settings: { type: Schema.Types.Mixed, required: true },
  rawResponse: { type: encryptedPayloadSchema, required: true },
  normalizedData: { type: encryptedPayloadSchema, required: true },
  calculatedAt: { type: Date, required: true },
}, { timestamps: true });

export const KundliBirthData = model('KundliBirthData', birthDataSchema);
export const KundliSnapshot = model('KundliSnapshot', kundliSnapshotSchema);
export const KundliMatchReport = model('KundliMatchReport', kundliMatchReportSchema);