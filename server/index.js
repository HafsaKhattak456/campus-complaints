import mongoose from 'mongoose';
import { createApp } from './app.js';
import { Complaint } from './Complaint.js';
import { Session } from './Session.js';
import { User } from './User.js';

const { MONGODB_URI, PORT = 5000 } = process.env;
if (!MONGODB_URI) {
  console.error('Set MONGODB_URI in server/.env.');
  process.exit(1);
}

try {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([User.init(), Session.init(), Complaint.init()]);
  const server = createApp().listen(Number(PORT), '127.0.0.1', () => {
    console.log(`API listening on http://127.0.0.1:${PORT}`);
  });
  server.on('error', (error) => {
    console.error('Could not start the API listener', error.code);
    process.exit(1);
  });
} catch (error) {
  console.error('Could not initialize MongoDB. Check the URI and database availability.', error.name);
  process.exit(1);
}
