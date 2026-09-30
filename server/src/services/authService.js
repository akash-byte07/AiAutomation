import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { database } from '../config/db.js';
import { env } from '../config/env.js';

const publicUser = ({ passwordHash, ...user }) => user;

export const authService = {
  async register({ name, email, password }) {
    const normalizedEmail = email.toLowerCase();
    if (await database.findOne('users', { email: normalizedEmail })) {
      throw Object.assign(new Error('An account already exists for this email.'), { status: 409, code: 'EMAIL_IN_USE' });
    }
    const user = await database.create('users', { name, email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12) });
    return this.createSession(user);
  },
  async login({ email, password }) {
    const user = await database.findOne('users', { email: email.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw Object.assign(new Error('Email or password is incorrect.'), { status: 401, code: 'INVALID_CREDENTIALS' });
    }
    return this.createSession(user);
  },
  createSession(user) {
    const token = jwt.sign({ id: user.id, email: user.email }, env.jwtSecret, { expiresIn: '7d' });
    return { token, user: publicUser(user) };
  },
  async getUser(id) {
    const user = await database.find('users', id);
    return user ? publicUser(user) : null;
  },
};