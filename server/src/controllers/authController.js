import { authService } from '../services/authService.js';

export const authController = {
  async register(req, res) { const session = await authService.register(req.body); res.cookie('relay_session', session.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 }); res.status(201).json(session); },
  async login(req, res) { const session = await authService.login(req.body); res.cookie('relay_session', session.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 }); res.json(session); },
  logout(req, res) { res.clearCookie('relay_session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' }); res.status(204).end(); },
  async me(req, res) { res.json({ user: await authService.getUser(req.user.id) }); },
};