import mongoose from 'mongoose';
import { setServers } from 'node:dns';
import { env } from './env.js';
import { models } from '../models/schemas.js';

let connected = false;
const memory = new Map(Object.keys(models).map((name) => [name, new Map()]));

export async function connectDatabase() {
  if (!env.mongoUri) {
    console.info('MONGODB_URI not set; using the in-memory data store.');
    return false;
  }

  try {
    if (env.mongoDnsServers.length) setServers(env.mongoDnsServers);
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 4000 });
    connected = true;
    console.info('Connected to MongoDB.');
    return true;
  } catch (error) {
    console.warn(`MongoDB unavailable (${error.message}); using the in-memory data store.`);
    connected = false;
    return false;
  }
}

const normalize = (doc) => {
  if (!doc) return null;
  const value = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = value;
  return { ...rest, id: String(_id || value.id) };
};

export const database = {
  async create(collection, value) {
    if (connected) return normalize(await models[collection].create(value));
    const doc = { ...value, id: value.id || crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    memory.get(collection).set(doc.id, doc);
    return doc;
  },
  async find(collection, id) {
    if (connected) return normalize(await models[collection].findById(id));
    return memory.get(collection).get(String(id)) || null;
  },
  async findOne(collection, query) {
    if (connected) return normalize(await models[collection].findOne(query));
    return [...memory.get(collection).values()].find((item) => Object.entries(query).every(([key, value]) => item[key] === value)) || null;
  },
  async list(collection, query = {}) {
    if (connected) return (await models[collection].find(query).sort({ createdAt: -1 })).map(normalize);
    return [...memory.get(collection).values()].filter((item) => Object.entries(query).every(([key, value]) => item[key] === value));
  },
  async update(collection, id, patch) {
    if (connected) return normalize(await models[collection].findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }));
    const current = memory.get(collection).get(String(id));
    if (!current) return null;
    const updated = { ...current, ...patch, id: current.id, updatedAt: new Date().toISOString() };
    memory.get(collection).set(String(id), updated);
    return updated;
  },
  async remove(collection, id) {
    if (connected) return Boolean(await models[collection].findByIdAndDelete(id));
    return memory.get(collection).delete(String(id));
  },
  get isPersistent() { return connected; },
};