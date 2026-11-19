import mongoose from 'mongoose';
import { User } from './User.js';
import { hashPassword, normalizeEmail, validEmail, validPassword } from './passwords.js';

const { MONGODB_URI, ADMIN_PASSWORD } = process.env;
const email = normalizeEmail(process.env.ADMIN_EMAIL);

if (!MONGODB_URI || !validEmail(email) || !validPassword(ADMIN_PASSWORD)) {
  console.error('Set MONGODB_URI, ADMIN_EMAIL and a 12–128 character ADMIN_PASSWORD in server/.env.');
  process.exit(1);
}

try {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await User.init();
  await User.create({
    name: 'Campus Admin',
    email,
    passwordHash: await hashPassword(ADMIN_PASSWORD),
    role: 'admin',
  });
  console.log('Admin account created.');
} catch (error) {
  console.error(error.code === 11000
    ? 'That email is already registered. Use a separate email for the admin account.'
    : 'Could not create the admin account. Check your MongoDB connection.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
