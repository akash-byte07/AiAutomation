import express from 'express';
import http from 'node:http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import { connectDatabase, database } from './config/db.js';
import { configureSocket, joinUserRoom } from './config/socket.js';
import { initializeExecutionQueue, } from './queues/executionQueue.js';
import { processExecution } from './services/executionService.js';
import authRoutes from './routes/authRoutes.js';
import workflowRoutes from './routes/workflowRoutes.js';
import executionRoutes from './routes/executionRoutes.js';
import integrationRoutes from './routes/integrationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { errorHandler, notFound } from './middleware/errors.js';

await connectDatabase();
await initializeExecutionQueue(processExecution);

const app = express();
const server = http.createServer(app);
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.nodeEnv === 'production' ? 12 : 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a few minutes and try again.' },
});
configureSocket(server).on('connection', joinUserRoom);
app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', persistence: database.isPersistent ? 'mongodb' : 'memory-fallback', queue: process.env.REDIS_URL ? 'redis-or-memory-fallback' : 'memory' }));
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/executions', executionRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use(notFound);
app.use(errorHandler);

server.listen(env.port, () => console.info(`Agent automation API listening on http://localhost:${env.port}`));