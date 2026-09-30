import { executionService } from '../services/executionService.js';

export const executionController = {
  async list(req, res) { res.json({ executions: await executionService.list(req.user.id) }); },
  async get(req, res) { res.json({ execution: await executionService.get(req.user.id, req.params.id) }); },
  async control(req, res) { res.json({ execution: await executionService.control(req.user.id, req.params.id, req.params.action) }); },
};