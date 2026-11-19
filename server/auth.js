import { createHash, randomBytes } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { normalizeEmail, validEmail, validPassword, verifyPassword } from './passwords.js';

const sessionAge = 8 * 60 * 60 * 1000;
const cookieName = 'campus_session';
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

function digest(token) {
  return createHash('sha256').update(token).digest('hex');
}

function readToken(req) {
  return req.headers.cookie?.match(/(?:^|;\s*)campus_session=([a-f0-9]{64})(?:;|$)/)?.[1];
}

function requireJson(req, res, next) {
  if (!req.is('application/json')) {
    return res.status(415).json({ message: 'Send an application/json request.' });
  }
  next();
}

export function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export function installAuth(app, users, sessions) {
  const loginLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    skipSuccessfulRequests: true,
    message: { message: 'Too many attempts. Try again in 15 minutes.' },
  });

  async function requireAuth(req, res, next) {
    const token = readToken(req);
    const session = token && await sessions.findOne({
      tokenHash: digest(token),
      expiresAt: { $gt: new Date() },
    }).populate('user');
    if (!session?.user) {
      return res.status(401).json({ message: 'Please sign in.' });
    }
    req.user = session.user;
    next();
  }

  app.use(['/api/auth/login', '/api/auth/me', '/api/auth/logout', '/api/admin', '/api/complaints'], (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.post('/api/auth/login', requireJson, loginLimit, async (req, res) => {
    const { email, password } = req.body ?? {};
    const cleanEmail = normalizeEmail(email);
    const invalidLogin = { message: 'Email or password is incorrect.' };
    if (!validEmail(cleanEmail) || !validPassword(password)) {
      return res.status(401).json(invalidLogin);
    }

    const user = await users.findOne({ email: cleanEmail }).select('+passwordHash');
    const matches = await verifyPassword(password, user?.passwordHash);
    if (!user || !matches) {
      return res.status(401).json(invalidLogin);
    }

    const previousToken = readToken(req);
    if (previousToken) await sessions.deleteOne({ tokenHash: digest(previousToken) });
    const token = randomBytes(32).toString('hex');
    await sessions.create({
      tokenHash: digest(token),
      user: user.id,
      expiresAt: new Date(Date.now() + sessionAge),
    });
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: sessionAge });
    return res.json({ user: publicUser(user) });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

  app.post('/api/auth/logout', requireJson, async (req, res) => {
    const token = readToken(req);
    if (token) await sessions.deleteOne({ tokenHash: digest(token) });
    res.clearCookie(cookieName, cookieOptions);
    return res.sendStatus(204);
  });

  app.get('/api/admin/dashboard', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access is required.' });
    }
    return res.json({ title: 'Admin dashboard' });
  });

  return requireAuth;
}
