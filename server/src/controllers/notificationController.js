import { database } from '../config/db.js';

export const notificationController = {
  async list(req, res) {
    const notifications = await database.list('notifications', { ownerId: req.user.id });
    res.json({ notifications });
  },
};