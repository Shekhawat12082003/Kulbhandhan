import { connectDb } from './config/db';
import { User } from './models/User';

const email = process.argv[2];
if (!email) { console.error('Usage: npm run seed:admin -- admin@example.com'); process.exit(1); }

(async () => {
  await connectDb();
  const user = await User.findOneAndUpdate(
    { email },
    { email, role: 'ADMIN', ageConfirmed: true, dateOfBirth: new Date('1990-01-01'), moderationState: 'active' },
    { upsert: true, new: true }
  );
  console.log(`${email} is now ADMIN (id ${user.id}). Log in from the app or admin page using this email via OTP; the code prints in this server's console.`);
  process.exit(0);
})();
