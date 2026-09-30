import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { encrypt, decrypt } from '../src/services/credentialService.js';
import { aiService } from '../src/services/aiService.js';
import { authService } from '../src/services/authService.js';

test('integration credentials encrypt and decrypt without storing plaintext', () => {
  const credentials = { accessToken: 'private-token', refreshToken: 'refresh-token' };
  const encrypted = encrypt(credentials);
  assert.equal(JSON.stringify(encrypted).includes(credentials.accessToken), false);
  assert.deepEqual(decrypt(encrypted), credentials);
});

test('prompt generation uses a deterministic graph when AI providers are not configured', async () => {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const workflow = await aiService.generate('Send a message to our Slack channel');
    assert.equal(workflow.generatedBy, 'rules');
    assert.match(workflow.generationNote, /No hosted AI keys are configured/);
    assert.equal(workflow.nodes.length, 3);
    assert.equal(workflow.nodes[1].data.provider, 'slack');
    assert.equal(workflow.edges.length, 2);
  } finally {
    if (openRouterKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = openRouterKey;
    if (geminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = geminiKey;
  }
});

test('registration hashes passwords and creates a valid login session', async () => {
  const email = `test-${crypto.randomUUID()}@example.test`;
  const registered = await authService.register({ name: 'Test Operator', email, password: 'local-test-password' });
  assert.ok(registered.token);
  assert.equal(registered.user.email, email);
  assert.equal('passwordHash' in registered.user, false);
  const loggedIn = await authService.login({ email, password: 'local-test-password' });
  assert.ok(loggedIn.token);
  await assert.rejects(authService.login({ email, password: 'incorrect-password' }), { code: 'INVALID_CREDENTIALS' });
});