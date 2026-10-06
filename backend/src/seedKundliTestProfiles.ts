import mongoose from 'mongoose';
import { connectDb } from './config/db';
import { Profile } from './models/Profile';
import { User } from './models/User';
import { saveBirthDetails } from './services/astrology/birthData';

const people = [
  {
    email: 'kundli.test1@kulbandhan.test', name: 'Riya Chauhan (KUNDLI TEST)', gender: 'female', dob: '1997-06-10',
    city: 'Jaipur', state: 'Rajasthan', kul: 'Chauhan', gotra: 'Vatsa', time: '07:30', heightCm: 163,
    latitude: 26.9124, longitude: 75.7873, paternal: 'Test Dadera Jaipur', maternal: 'Test Nanihal Ajmer',
  },
  {
    email: 'kundli.test2@kulbandhan.test', name: 'Naina Rathore (KUNDLI TEST)', gender: 'female', dob: '1998-11-21',
    city: 'Jodhpur', state: 'Rajasthan', kul: 'Rathore', gotra: 'Kashyap', time: '13:15', heightCm: 158,
    latitude: 26.2389, longitude: 73.0243, paternal: 'Test Dadera Jodhpur', maternal: 'Test Nanihal Pali',
  },
  {
    email: 'kundli.test3@kulbandhan.test', name: 'Ved Singh (KUNDLI TEST)', gender: 'male', dob: '1996-02-15',
    city: 'Delhi', state: 'Delhi', kul: 'Shekhawat', gotra: 'Bharadwaj', time: '18:45', heightCm: 178,
    latitude: 28.6139, longitude: 77.2090, paternal: 'Test Dadera Delhi', maternal: 'Test Nanihal Jaipur',
  },
  {
    email: 'kundli.test4@kulbandhan.test', name: 'Arjun Solanki (KUNDLI TEST)', gender: 'male', dob: '1997-08-04',
    city: 'Udaipur', state: 'Rajasthan', kul: 'Solanki', gotra: 'Gautam', time: '22:10', heightCm: 182,
    latitude: 24.5854, longitude: 73.7125, paternal: 'Test Dadera Udaipur', maternal: 'Test Nanihal Kota',
  },
] as const;

async function main() {
  await connectDb();
  let birthDetailsSkipped = false;
  try {
    for (const person of people) {
      const dateOfBirth = new Date(`${person.dob}T00:00:00.000Z`);
      const user = await User.findOneAndUpdate({ email: person.email }, {
        $set: {
          email: person.email, dateOfBirth, ageConfirmed: true, managedBy: 'self',
          moderationState: 'active', role: 'USER', onboardingStep: 15,
        },
      }, { upsert: true, new: true, setDefaultsOnInsert: true });

      await Profile.findOneAndUpdate({ userId: user._id }, {
        $set: {
          userId: user._id, displayName: person.name, gender: person.gender, dateOfBirth,
          city: person.city, state: person.state, education: 'B.Tech', profession: 'Software professional',
          heightCm: person.heightCm,
          about: 'Development-only profile for testing the Navamsha Kundli and mutual-match flow.',
          'family.intro': 'KULBANDHAN test family profile.',
          'family.type': 'Joint',
          'family.values': 'Test data only.',
          heritage: { kul: person.kul, gotra: person.gotra, vansh: 'Test Vansh', nativePlace: person.city },
          lineage: { paternal: person.paternal, maternal: person.maternal },
          published: true, isTestData: true,
        },
      }, { upsert: true, new: true, setDefaultsOnInsert: true });

      try {
        await saveBirthDetails(String(user._id), {
          birthTime: person.time, birthPlace: `${person.city}, ${person.state}, India`, city: person.city, state: person.state,
          country: 'India', latitude: person.latitude, longitude: person.longitude, timezone: 'Asia/Kolkata', utcOffsetHours: 5.5,
        });
      } catch (error: any) {
        if (!['KUNDLI_STORAGE_NOT_CONFIGURED', 'KUNDLI_ENCRYPTION_KEY_INVALID'].includes(error.code)) throw error;
        birthDetailsSkipped = true;
      }
    }
    console.log('Seeded 4 KUNDLI TEST profiles. Development login code: 123456.');
    for (const person of people) console.log(person.email);
    if (birthDetailsSkipped) console.warn('Birth inputs were not stored. Set a separate valid KUNDLI_DATA_ENCRYPTION_KEY and enter birth details in the app.');
  } finally { await mongoose.disconnect(); }
}

main().catch((error) => {
  console.error('Could not seed Kundli test profiles:', error.message);
  process.exitCode = 1;
});