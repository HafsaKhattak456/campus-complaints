import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { User } from './User.js';

import { createAdminComplaintRouter } from './adminComplaints.js';
import { Complaint } from './Complaint.js';
import { createComplaintRouter } from './complaints.js';
import { Session } from './Session.js';
import { installAuth, publicUser } from './auth.js';
import { hashPassword, normalizeEmail, validEmail, validPassword } from './passwords.js';

export function createApp(users = User, sessions = Session, complaints = Complaint) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '8kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  const registrationLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many attempts. Try again in 15 minutes.' },
  });

  app.post('/api/auth/register', registrationLimit, async (req, res) => {
    const { name, email, password } = req.body ?? {};
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = normalizeEmail(email);

    if (!cleanName || cleanName.length > 100) {
      return res.status(400).json({ message: 'Enter a name of 1–100 characters.' });
    }
    if (!validEmail(cleanEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (!validPassword(password)) {
      return res.status(400).json({ message: 'Use a password of 12–128 characters.' });
    }

    try {
      const user = await users.create({
        name: cleanName,
        email: cleanEmail,
        passwordHash: await hashPassword(password),
        role: 'student',
      });
      return res.status(201).json({
        user: publicUser(user),
        message: 'Your student account was created.',
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: 'An account already uses this email.' });
      }
      throw error;
    }
  });

  const requireAuth = installAuth(app, users, sessions);
  app.use('/api/admin/complaints', requireAuth, createAdminComplaintRouter(complaints));
  app.use('/api/complaints', requireAuth, createComplaintRouter(complaints));

  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'Send a valid JSON request.' });
    }
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ message: 'The request is too large.' });
    }
    console.error('API request failed', error.name);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  });

  return app;
}
