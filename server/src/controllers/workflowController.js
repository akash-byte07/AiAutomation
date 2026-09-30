import { workflowService } from '../services/workflowService.js';
import { executionService } from '../services/executionService.js';

export const workflowController = {
  async list(req, res) { res.json({ workflows: await workflowService.list(req.user.id) }); },
  async get(req, res) { res.json({ workflow: await workflowService.get(req.user.id, req.params.id) }); },
  async create(req, res) { res.status(201).json({ workflow: await workflowService.create(req.user.id, req.body) }); },
  async generate(req, res) { res.status(201).json({ workflow: await workflowService.generate(req.user.id, req.body.prompt) }); },
  async update(req, res) { res.json({ workflow: await workflowService.update(req.user.id, req.params.id, req.body) }); },
  async remove(req, res) { await workflowService.remove(req.user.id, req.params.id); res.status(204).end(); },
  async run(req, res) {
    const workflow = await workflowService.get(req.user.id, req.params.id);
    res.status(202).json({ execution: await executionService.start(req.user.id, workflow) });
  },
};