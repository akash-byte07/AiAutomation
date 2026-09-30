import IORedis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { env } from '../config/env.js';

let queue;
let redis;
let fallbackHandler;

export async function initializeExecutionQueue(handler) {
  fallbackHandler = handler;
  if (!env.redisUrl) {
    console.info('REDIS_URL not set; using the in-memory execution queue.');
    return;
  }
  try {
    redis = new IORedis(env.redisUrl, { maxRetriesPerRequest: null, connectTimeout: 2500, retryStrategy: () => null });
    await redis.ping();
    queue = new Queue('workflow-executions', { connection: redis });
    new Worker('workflow-executions', async (job) => fallbackHandler(job.data.executionId), { connection: redis });
    console.info('Connected to Redis execution queue.');
  } catch (error) {
    console.warn(`Redis unavailable (${error.message}); using the in-memory execution queue.`);
    queue = undefined;
    redis?.disconnect();
    redis = undefined;
  }
}

export async function enqueueExecution(executionId) {
  if (queue) return queue.add('run', { executionId }, { removeOnComplete: 100, removeOnFail: 100 });
  queueMicrotask(() => fallbackHandler?.(executionId));
}