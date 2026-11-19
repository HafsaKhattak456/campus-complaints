import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);
const dummyHash = '0'.repeat(32) + ':' + '0'.repeat(128);

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await deriveKey(password, salt, 64);
  return salt + ':' + key.toString('hex');
}

export async function verifyPassword(password, hash = dummyHash) {
  const [salt, key] = hash.split(':');
  const expected = Buffer.from(key, 'hex');
  const actual = await deriveKey(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function validEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validPassword(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128;
}
