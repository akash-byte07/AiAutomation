import crypto from 'node:crypto';
import { env } from '../config/env.js';

const key = () => crypto.createHash('sha256').update(env.encryptionKey).digest();

export function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { iv: iv.toString('base64'), data: encrypted.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}

export function decrypt(value) {
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(value.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
    const plain = Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]);
    return JSON.parse(plain.toString('utf8'));
  } catch {
    throw Object.assign(new Error('Integration credentials could not be decrypted.'), { status: 401, code: 'AUTH_EXPIRED' });
  }
}