import { database } from '../config/db.js';
import { aiService } from './aiService.js';

function owned(record, userId) {
  if (!record || record.ownerId !== userId) throw Object.assign(new Error('Workflow was not found.'), { status: 404, code: 'NOT_FOUND' });
  return record;
}

export const workflowService = {
  list(userId) { return database.list('workflows', { ownerId: userId }); },
  async get(userId, id) { return owned(await database.find('workflows', id), userId); },
  async create(userId, values) {
    return database.create('workflows', { ownerId: userId, name: values.name, prompt: values.prompt || '', nodes: values.nodes || [], edges: values.edges || [], status: 'draft' });
  },
  async generate(userId, prompt) {
    const generated = await aiService.generate(prompt);
    return database.create('workflows', { ownerId: userId, ...generated, prompt, status: 'draft' });
  },
  async update(userId, id, patch) {
    const current = await this.get(userId, id);
    return database.update('workflows', current.id, { ...patch, ownerId: userId });
  },
  async remove(userId, id) {
    const current = await this.get(userId, id);
    await database.remove('workflows', current.id);
  },
};