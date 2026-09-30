import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, CircleAlert, Link2, LockKeyhole, Unplug, X } from 'lucide-react';
import { api, apiBaseUrl } from '@/services/api';

const providers = [
  { id: 'gmail', name: 'Gmail', category: 'COMMUNICATION', mark: 'G', color: 'provider-google', oauth: 'google' },
  { id: 'slack', name: 'Slack', category: 'COMMUNICATION', mark: '#', color: 'provider-slack', oauth: 'slack' },
  { id: 'discord', name: 'Discord', category: 'COMMUNICATION', mark: 'D', color: 'provider-discord', oauth: 'discord' },
  { id: 'google-sheets', name: 'Google Sheets', category: 'DATA', mark: 'S', color: 'provider-sheets', oauth: 'google-sheets' },
];

export default function IntegrationsPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState([]);
  const [manual, setManual] = useState(null);
  const [credentialText, setCredentialText] = useState('');
  const [account, setAccount] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function refresh() { const [connections, health] = await Promise.all([api('/integrations'), api('/integrations/status')]); setItems(connections.integrations); setStatus(health.integrations); }
  useEffect(() => {
    let active = true;
    Promise.all([api('/integrations'), api('/integrations/status')]).then(([connections, health]) => {
      if (active) { setItems(connections.integrations); setStatus(health.integrations); }
    }).catch((problem) => { if (active) setError(problem.message); });
    return () => { active = false; };
  }, []);

  async function connectManual(event) {
    event.preventDefault(); setError(''); setSaved(false);
    try { const credentials = JSON.parse(credentialText); await api('/integrations', { method: 'POST', body: JSON.stringify({ provider: manual, credentials, account }) }); setManual(null); setCredentialText(''); setAccount(''); setSaved(true); await refresh(); }
    catch (problem) { setError(problem instanceof SyntaxError ? 'Credentials must be valid JSON.' : problem.message); }
  }

  return <div className="integrations-page"><div className="page-heading"><div><span className="eyebrow">SECURE CONNECTIONS</span><h1>Integrations</h1><p>Connect the services your workflows need to reach.</p></div><span className="encryption-note"><LockKeyhole size={14} />CREDENTIALS ENCRYPTED AT REST</span></div>{error && <div className="inline-error"><CircleAlert size={16} />{error}</div>}{saved && <div className="inline-success"><Check size={16} />Connection saved securely.</div>}<section className="integrations-grid">{providers.map((provider) => {
    const connection = items.find((item) => item.provider === provider.id);
    const health = status.find((item) => item.provider === provider.id);
    const connected = connection?.connected;
    return <article className="integration-row" key={provider.id}><div className="integration-main"><span className={`provider-mark ${provider.color}`}>{provider.mark}</span><div><span className="eyebrow">{provider.category}</span><h2>{provider.name}</h2><small>{connected ? connection.account || 'Connected' : 'Not connected'}</small></div></div><div className="integration-state"><span className={`connection-indicator ${connected ? 'is-connected' : ''}`} />{connected ? health?.status || 'connected' : 'Not connected'}</div>{connected ? <button className="quiet-button integration-action" onClick={() => { setManual(provider.id); setCredentialText(''); }}><Unplug size={15} />Reconnect</button> : <div className="integration-actions"><a className="quiet-button" href={`${apiBaseUrl}/integrations/oauth/${provider.oauth}/start`}><Link2 size={15} />OAuth <ArrowUpRight size={13} /></a><button className="icon-button manual-action" aria-label={`Set up ${provider.name} credentials manually`} title="Set up credentials manually" onClick={() => setManual(provider.id)}><LockKeyhole size={15} /></button></div>}</article>;
  })}</section><div className="integration-footnote"><CircleAlert size={15} /><span>Provider credentials and OAuth client IDs are configured through your local environment. Unavailable credentials return explicit connection errors during runs.</span></div>{manual && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setManual(null); }}><form className="credential-modal" onSubmit={connectManual}><div className="modal-title"><div><span className="eyebrow">MANUAL SETUP</span><h2>Connect {providers.find((item) => item.id === manual)?.name}</h2></div><button type="button" className="icon-button" onClick={() => setManual(null)} aria-label="Close"><X size={16} /></button></div><label className="field-label">Account label<input value={account} onChange={(event) => setAccount(event.target.value)} placeholder="e.g. Operations account" /></label><label className="field-label">Credentials JSON<textarea rows={7} required value={credentialText} onChange={(event) => setCredentialText(event.target.value)} placeholder={'{"accessToken":"...","refreshToken":"..."}'} /></label><small className="modal-warning">Credentials are encrypted before storage. They are never returned by the API.</small><button className="primary-button" type="submit"><LockKeyhole size={15} />Save encrypted connection</button></form></div>}</div>;
}