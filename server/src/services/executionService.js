import { database } from '../config/db.js';
import { emitToUser } from '../config/socket.js';
import { createExecutionPlan } from '../agents/orchestrator.js';
import { describeAction } from '../agents/executionAgent.js';
import { recoverAction } from '../agents/recoveryAgent.js';
import { summarizeExecution } from '../agents/monitoringAgent.js';
import { integrationService } from './integrationService.js';
import { enqueueExecution } from '../queues/executionQueue.js';

function assertOwner(record, userId) {
  if (!record || record.ownerId !== userId) throw Object.assign(new Error('Execution was not found.'), { status: 404, code: 'NOT_FOUND' });
  return record;
}

async function recordEvent(execution, agent, event, message, metadata = {}) {
  const entry = { id: crypto.randomUUID(), agent, event, message, metadata, createdAt: new Date().toISOString() };
  await database.create('executionLogs', { ownerId: execution.ownerId, executionId: execution.id, ...entry });
  execution.events = [...(execution.events || []), entry];
  await database.update('executions', execution.id, { events: execution.events });
  emitToUser(execution.ownerId, 'execution:event', { executionId: execution.id, ...entry });
  return entry;
}

async function waitWhilePaused(execution) {
  while (true) {
    const latest = await database.find('executions', execution.id);
    if (latest?.status !== 'paused') return latest?.status !== 'cancelled';
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}

export async function processExecution(executionId) {
  let execution = await database.find('executions', executionId);
  if (!execution || execution.status === 'cancelled') return;
  if (execution.status === 'paused' && !(await waitWhilePaused(execution))) return;
  execution = await database.find('executions', executionId);
  if (execution?.status === 'cancelled') return;
  const workflow = await database.find('workflows', execution.workflowId);
  if (!workflow) return database.update('executions', executionId, { status: 'failed', error: 'Workflow was deleted.' });
  execution = await database.update('executions', executionId, { status: 'running', startedAt: new Date().toISOString() });
  emitToUser(execution.ownerId, 'execution:updated', execution);
  try {
    const plan = createExecutionPlan(workflow);
    await recordEvent(execution, 'planner', 'plan.created', plan.summary, { steps: plan.steps.length });
    const ordered = [...workflow.nodes].sort((left, right) => left.position.y - right.position.y || left.position.x - right.position.x);
    for (const node of ordered) {
      if (node.type === 'trigger') continue;
      if (!(await waitWhilePaused(execution))) return;
      if (node.type === 'validation') {
        await recordEvent(execution, 'validation', 'workflow.validated', 'Workflow structure is valid.', { nodeId: node.id });
        continue;
      }
      const action = describeAction(node);
      await recordEvent(execution, 'execution', 'action.started', `Running ${action.label}.`, { nodeId: node.id, provider: action.provider });
      let result;
      try {
        result = await integrationService.executeAction(execution.ownerId, node);
      } catch (error) {
        const recovery = recoverAction(error, 0);
        await recordEvent(execution, 'recovery', recovery.recovered ? 'action.retrying' : 'action.escalated', recovery.message, { nodeId: node.id, code: error.code || 'ACTION_FAILED' });
        if (recovery.recovered) result = await integrationService.executeAction(execution.ownerId, node);
        else throw error;
      }
      await recordEvent(execution, 'execution', 'action.completed', `${action.label} completed.`, { nodeId: node.id, result });
    }
    const current = await database.find('executions', execution.id);
    if (current?.status === 'cancelled') return;
    const summary = summarizeExecution('succeeded', execution.events.length);
    await recordEvent(execution, 'monitoring', 'execution.completed', 'All workflow steps completed.', summary);
    await database.update('executions', execution.id, { status: 'succeeded', finishedAt: new Date().toISOString() });
    await database.create('notifications', { ownerId: execution.ownerId, title: 'Workflow completed', message: `${workflow.name} finished successfully.`, read: false });
  } catch (error) {
    const status = error.code === 'INTEGRATION_NOT_CONNECTED' || error.code === 'AUTH_EXPIRED' ? error.code : 'failed';
    await recordEvent(execution, 'monitoring', 'execution.failed', error.message, { code: error.code || 'EXECUTION_FAILED' });
    await database.update('executions', execution.id, { status: 'failed', error: error.message, errorCode: status, finishedAt: new Date().toISOString() });
    await database.create('notifications', { ownerId: execution.ownerId, title: 'Workflow needs attention', message: `${workflow.name}: ${error.message}`, read: false });
  }
  const finished = await database.find('executions', execution.id);
  emitToUser(execution.ownerId, 'execution:updated', finished);
}

export const executionService = {
  async start(userId, workflow) {
    const plan = createExecutionPlan(workflow);
    const execution = await database.create('executions', { ownerId: userId, workflowId: workflow.id, status: 'queued', events: [], plan: plan.steps, createdAt: new Date().toISOString() });
    emitToUser(userId, 'execution:updated', execution);
    await enqueueExecution(execution.id);
    return execution;
  },
  list(userId) { return database.list('executions', { ownerId: userId }); },
  async get(userId, id) { return assertOwner(await database.find('executions', id), userId); },
  async control(userId, id, action) {
    const execution = await this.get(userId, id);
    const transitions = { pause: ['running', 'queued'], resume: ['paused'], cancel: ['running', 'queued', 'paused'] };
    if (!transitions[action]?.includes(execution.status)) throw Object.assign(new Error(`Cannot ${action} an execution in ${execution.status} state.`), { status: 409, code: 'INVALID_EXECUTION_STATE' });
    const status = action === 'pause' ? 'paused' : action === 'cancel' ? 'cancelled' : 'running';
    const updated = await database.update('executions', id, { status });
    const eventName = action === 'cancel' ? 'execution.cancelled' : `execution.${action}d`;
    await recordEvent(updated, 'monitoring', eventName, `Execution ${action} requested.`);
    emitToUser(userId, 'execution:updated', updated);
    return updated;
  },
};