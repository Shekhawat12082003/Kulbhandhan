import { Schema, model } from 'mongoose';

const familySchema = new Schema({ intro: String, type: String, values: String }, { _id: false });

const profileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    displayName: { type: String, required: true, trim: true, maxlength: 60 },
    gender: { type: String, enum: ['male', 'female'], required: true, index: true },
    dateOfBirth: { type: Date, required: true, index: true },
    heightCm: Number,
    city: { type: String, index: true },
    state: String,
    education: { type: String, index: true },
    profession: { type: String, index: true },
    about: { type: String, maxlength: 800 },
    family: { type: familySchema, default: () => ({}) },
    heritage: { kul: { type: String, index: true }, vansh: String, gotra: { type: String, index: true }, nativePlace: String },
    lineage: { paternal: String, maternal: String },
    kundli: {
      birthTime: String, birthPlace: String, birthCity: String, birthState: String, birthCountry: String,
      birthLatitude: Number, birthLongitude: Number, birthTimezone: String, utcOffsetHours: Number,
      manglik: { type: String, enum: ['yes', 'no', 'unknown'], default: 'unknown' },
      moonNakshatra: Number, pada: Number, lagna: Number,
      source: { type: String, enum: ['mock', 'provider', 'manual'] },
    },
    prefs: { ageMin: Number, ageMax: Number, cities: [String] },
    published: { type: Boolean, default: false, index: true },
    isTestData: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export const Profile = model('Profile', profileSchema);
