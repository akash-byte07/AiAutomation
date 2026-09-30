import { planExecution } from './plannerAgent.js';
import { validateWorkflow } from './validationAgent.js';

export function createExecutionPlan(workflow) {
  const validation = validateWorkflow(workflow);
  if (!validation.valid) throw Object.assign(new Error(validation.reason), { status: 400, code: 'INVALID_WORKFLOW' });
  return planExecution(workflow);
}