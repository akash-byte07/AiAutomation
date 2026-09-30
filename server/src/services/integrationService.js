import crypto from 'node:crypto';
import { database } from '../config/db.js';
import { env } from '../config/env.js';
import { decrypt, encrypt } from './credentialService.js';

const configs = {
  google: { authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', envPrefix: 'GOOGLE', scope: 'openid email https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/spreadsheets' },
  slack: { authorize: 'https://slack.com/oauth/v2/authorize', token: 'https://slack.com/api/oauth.v2.access', envPrefix: 'SLACK', scope: 'chat:write' },
  discord: { authorize: 'https://discord.com/oauth2/authorize', token: 'https://discord.com/api/oauth2/token', envPrefix: 'DISCORD', scope: 'identify bot' },
};

export const integrationService = {
  providers: ['gmail', 'slack', 'discord', 'google-sheets'],
  async list(userId) {
    const rows = await database.list('integrations', { ownerId: userId });
    return this.providers.map((provider) => {
      const row = rows.find((item) => item.provider === provider);
      return { provider, connected: Boolean(row), status: row?.status || 'not_connected', account: row?.account || null, updatedAt: row?.updatedAt || null };
    });
  },
  async status(userId) {
    const rows = await database.list('integrations', { ownerId: userId });
    return this.providers.map((provider) => {
      const row = rows.find((item) => item.provider === provider);
      if (!row) return { provider, status: 'INTEGRATION_NOT_CONNECTED' };
      const credentials = decrypt(row.credentials);
      const expired = credentials.expiresAt && credentials.expiresAt < Date.now();
      return { provider, status: expired ? 'AUTH_EXPIRED' : 'connected', expiresAt: credentials.expiresAt || null };
    });
  },
  async save(userId, provider, credentials, account = 'Manual connection') {
    const existing = await database.findOne('integrations', { ownerId: userId, provider });
    const values = { ownerId: userId, provider, credentials: encrypt(credentials), account, status: 'connected' };
    return existing ? database.update('integrations', existing.id, values) : database.create('integrations', values);
  },
  async getCredentials(userId, provider) {
    const integration = await database.findOne('integrations', { ownerId: userId, provider });
    if (!integration) throw Object.assign(new Error(`${provider} is not connected.`), { status: 409, code: 'INTEGRATION_NOT_CONNECTED' });
    const credentials = decrypt(integration.credentials);
    if (credentials.expiresAt && credentials.expiresAt < Date.now()) throw Object.assign(new Error(`${provider} credentials have expired.`), { status: 401, code: 'AUTH_EXPIRED' });
    return credentials;
  },
  startOAuth(provider, userId) {
    const config = configs[provider];
    const prefix = config?.envPrefix;
    const clientId = prefix && process.env[`${prefix}_CLIENT_ID`];
    if (!config || !clientId) throw Object.assign(new Error(`${provider} OAuth is not configured.`), { status: 400, code: 'OAUTH_NOT_CONFIGURED' });
    const statePayload = Buffer.from(JSON.stringify({ userId, provider, nonce: crypto.randomBytes(24).toString('hex'), expiresAt: Date.now() + 10 * 60 * 1000 })).toString('base64url');
    const signedState = `${statePayload}.${crypto.createHmac('sha256', env.jwtSecret).update(statePayload).digest('hex')}`;
    const redirectUri = process.env[`${prefix}_REDIRECT_URI`] || `${env.clientUrl.replace(':3000', ':4000')}/api/integrations/oauth/${provider}/callback`;
    const url = new URL(config.authorize);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', config.scope);
    url.searchParams.set('state', signedState);
    if (provider === 'google') url.searchParams.set('access_type', 'offline');
    return url.toString();
  },
  verifyOAuthState(state, provider) {
    const [payload, signature] = (state || '').split('.');
    const expected = crypto.createHmac('sha256', env.jwtSecret).update(payload || '').digest('hex');
    const actualBuffer = Buffer.from(signature || '', 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
      throw Object.assign(new Error('OAuth state is invalid or expired.'), { status: 400, code: 'OAUTH_STATE_INVALID' });
    }
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (value.provider !== provider || value.expiresAt < Date.now()) {
      throw Object.assign(new Error('OAuth state is invalid or expired.'), { status: 400, code: 'OAUTH_STATE_INVALID' });
    }
    return value.userId;
  },
  async completeOAuth(provider, code, userId) {
    const config = configs[provider];
    const prefix = config?.envPrefix;
    if (!config || !prefix) throw Object.assign(new Error('Unsupported OAuth provider.'), { status: 400, code: 'UNSUPPORTED_PROVIDER' });
    const redirectUri = process.env[`${prefix}_REDIRECT_URI`] || `${env.clientUrl.replace(':3000', ':4000')}/api/integrations/oauth/${provider}/callback`;
    const body = new URLSearchParams({ client_id: process.env[`${prefix}_CLIENT_ID`] || '', client_secret: process.env[`${prefix}_CLIENT_SECRET`] || '', code, redirect_uri: redirectUri, grant_type: 'authorization_code' });
    const response = await fetch(config.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    const result = await response.json();
    if (!response.ok || result.error) throw Object.assign(new Error('Provider token exchange failed.'), { status: 400, code: 'OAUTH_TOKEN_EXCHANGE_FAILED' });
    const credentials = { accessToken: result.access_token, refreshToken: result.refresh_token, tokenType: result.token_type, scope: result.scope, expiresAt: result.expires_in ? Date.now() + result.expires_in * 1000 : null };
    const account = result.team?.name || result.user?.name || 'OAuth connection';
    if (provider === 'google') {
      await this.save(userId, 'gmail', credentials, account);
      await this.save(userId, 'google-sheets', credentials, account);
    } else {
      await this.save(userId, provider, credentials, account);
    }
  },
  async executeAction(userId, node) {
    const provider = node.data?.provider;
    if (!this.providers.includes(provider)) return { simulated: true, message: 'No external provider action was configured.' };
    const credentials = await this.getCredentials(userId, provider);
    const token = credentials.accessToken;
    if (provider === 'slack') {
      const channel = node.data?.channel;
      if (!channel) throw Object.assign(new Error('Configure a Slack channel on this node.'), { status: 400, code: 'NODE_CONFIGURATION_REQUIRED' });
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, text: node.data?.message || node.data?.description || node.data?.label }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw Object.assign(new Error(result.error || 'Slack action failed.'), { status: 502, code: 'INTEGRATION_ACTION_FAILED' });
      return { provider, channel, timestamp: result.ts };
    }
    if (provider === 'gmail') {
      const to = node.data?.to;
      if (!to) throw Object.assign(new Error('Configure a recipient email on this node.'), { status: 400, code: 'NODE_CONFIGURATION_REQUIRED' });
      const subject = node.data?.subject || 'Automation notification';
      const message = node.data?.message || node.data?.description || '';
      const raw = Buffer.from(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${message}`).toString('base64url');
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }),
      });
      if (!response.ok) throw Object.assign(new Error('Gmail action failed.'), { status: 502, code: 'INTEGRATION_ACTION_FAILED' });
      const result = await response.json();
      return { provider, messageId: result.id };
    }
    if (provider === 'discord') {
      const channelId = node.data?.channelId;
      if (!channelId) throw Object.assign(new Error('Configure a Discord channel ID on this node.'), { status: 400, code: 'NODE_CONFIGURATION_REQUIRED' });
      const response = await fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`, {
        method: 'POST', headers: { Authorization: `${credentials.tokenType || 'Bot'} ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: node.data?.message || node.data?.description || node.data?.label }),
      });
      if (!response.ok) throw Object.assign(new Error('Discord action failed.'), { status: 502, code: 'INTEGRATION_ACTION_FAILED' });
      const result = await response.json();
      return { provider, messageId: result.id };
    }
    const spreadsheetId = node.data?.spreadsheetId;
    if (!spreadsheetId) throw Object.assign(new Error('Configure a Google spreadsheet ID on this node.'), { status: 400, code: 'NODE_CONFIGURATION_REQUIRED' });
    const range = encodeURIComponent(node.data?.range || 'Sheet1!A:Z');
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}:append?valueInputOption=USER_ENTERED`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [[new Date().toISOString(), node.data?.message || node.data?.description || node.data?.label]] }),
    });
    if (!response.ok) throw Object.assign(new Error('Google Sheets action failed.'), { status: 502, code: 'INTEGRATION_ACTION_FAILED' });
    const result = await response.json();
    return { provider, updatedRange: result.updates?.updatedRange };
  },
};