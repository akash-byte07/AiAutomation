import { env } from '../config/env.js';
import { integrationService } from '../services/integrationService.js';

export const integrationController = {
  async list(req, res) { res.json({ integrations: await integrationService.list(req.user.id) }); },
  async status(req, res) { res.json({ integrations: await integrationService.status(req.user.id) }); },
  async manual(req, res) {
    const { provider, credentials, account } = req.body;
    const integration = await integrationService.save(req.user.id, provider, credentials, account || 'Manual connection');
    res.status(201).json({ integration: { id: integration.id, provider, status: 'connected', account: integration.account } });
  },
  start(req, res) {
    const provider = req.params.provider === 'google-sheets' ? 'google' : req.params.provider;
    res.redirect(integrationService.startOAuth(provider, req.user.id));
  },
  async callback(req, res) {
    const { code, state, error } = req.query;
    if (error) return res.redirect(`${env.clientUrl}/integrations?oauth=error`);
    const provider = req.params.provider === 'google-sheets' ? 'google' : req.params.provider;
    const userId = integrationService.verifyOAuthState(state, provider);
    await integrationService.completeOAuth(provider, code, userId);
    const redirectProvider = provider === 'google' ? 'google-sheets' : provider;
    res.redirect(`${env.clientUrl}/integrations?connected=${encodeURIComponent(redirectProvider)}`);
  },
  oauthError(req, res) { res.status(400).json({ code: 'OAUTH_FAILED', message: String(req.query.error_description || req.query.error || 'OAuth authorization failed.') }); },
};