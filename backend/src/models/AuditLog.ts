import { Schema, model } from 'mongoose';

const auditSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId },
    details: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);
export const AuditLog = model('AuditLog', auditSchema);

export async function audit(adminId: string, action: string, targetType: string, targetId?: string, details?: string) {
  await AuditLog.create({ adminId, action, targetType, targetId, details });
}
