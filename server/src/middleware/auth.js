import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.cookies?.relay_session;
  if (!token) return res.status(401).json({ code: 'AUTH_REQUIRED', message: 'Sign in to continue.' });
  try {
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    res.status(401).json({ code: 'AUTH_EXPIRED', message: 'Your session has expired.' });
  }
}