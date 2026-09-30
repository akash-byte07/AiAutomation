import mongoose from 'mongoose';

const schema = (extra = {}) => new mongoose.Schema(extra, { timestamps: true, strict: false });

export const models = {
  users: mongoose.models.User || mongoose.model('User', schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
  })),
  workflows: mongoose.models.Workflow || mongoose.model('Workflow', schema({ ownerId: String, name: String, prompt: String, nodes: Array, edges: Array, status: String })),
  executions: mongoose.models.Execution || mongoose.model('Execution', schema({ ownerId: String, workflowId: String, status: String, events: Array })),
  executionLogs: mongoose.models.ExecutionLog || mongoose.model('ExecutionLog', schema({ ownerId: String, executionId: String, agent: String, event: String, message: String, metadata: Object })),
  integrations: mongoose.models.Integration || mongoose.model('Integration', schema({ ownerId: String, provider: String, credentials: Object, status: String })),
  notifications: mongoose.models.Notification || mongoose.model('Notification', schema({ ownerId: String, title: String, message: String, read: Boolean })),
};