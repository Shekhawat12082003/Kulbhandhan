import { connectDb } from './config/db';
import { User } from './models/User';
import { Profile } from './models/Profile';

const people = [
  ['Meera Singh', 'female', 'Jaipur', 'MBA', 'Product Manager', 'Rathore', 'Kashyap'],
  ['Ananya Chauhan', 'female', 'Delhi', 'B.Tech', 'Software Engineer', 'Chauhan', 'Vatsa'],
  ['Kavya Bhati', 'female', 'Jodhpur', 'M.Sc', 'Lecturer', 'Bhati', 'Gautam'],
  ['Aarav Sharma', 'male', 'Jaipur', 'B.Tech', 'Engineer', 'Shekhawat', 'Bharadwaj'],
  ['Rudra Rathore', 'male', 'Udaipur', 'MBA', 'Business Owner', 'Rathore', 'Kashyap'],
] as const;

(async () => {
  await connectDb();
  for (const [i, [name, gender, city, education, profession, kul, gotra]] of people.entries()) {
    const email = `test${i}@kulbandhan.test`;
    const dob = new Date(1996 + (i % 4), 3, 10 + i);
    const u = await User.findOneAndUpdate({ email }, { email, dateOfBirth: dob, ageConfirmed: true }, { upsert: true, new: true });
    await Profile.findOneAndUpdate({ userId: u._id }, {
      userId: u._id, displayName: `${name} (TEST)`, gender, dateOfBirth: dob, city, education, profession, published: true, isTestData: true,
      about: 'Development test profile.', heritage: { kul, gotra, vansh: 'Suryavansh' }, family: { intro: 'Test family', type: 'Joint' },
      kundli: { manglik: i % 2 ? 'yes' : 'no', moonNakshatra: (i * 5 + 2) % 27, pada: (i % 4) + 1, source: 'mock' },
    }, { upsert: true });
  }
  console.log('Seeded', people.length, 'test profiles');
  process.exit(0);
})();
