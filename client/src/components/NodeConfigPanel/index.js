import { useState } from 'react';
import Link from 'next/link';
import { SlidersHorizontal, X } from 'lucide-react';

const fieldsFor = (provider) => {
  if (provider === 'slack') return [['channel', 'Channel ID'], ['message', 'Message']];
  if (provider === 'gmail') return [['to', 'Recipient email'], ['subject', 'Subject'], ['message', 'Message']];
  if (provider === 'discord') return [['channelId', 'Channel ID'], ['message', 'Message']];
  if (provider === 'google-sheets') return [['spreadsheetId', 'Spreadsheet ID'], ['range', 'Cell range'], ['message', 'Row value']];
  return [['description', 'Instructions']];
};

export default function NodeConfigPanel({ node, onChange, onClose }) {
  const [draft, setDraft] = useState(node?.data || {});
  if (!node) return <section className="config-panel config-empty"><SlidersHorizontal size={19} /><p>Select a node to configure it</p><small>Node settings will appear here.</small></section>;

  function update(key, value) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onChange({ ...node, data: next });
  }

  const provider = draft.provider || 'slack';
  return <section className="config-panel"><div className="config-heading"><div><p className="panel-label">NODE SETTINGS</p><h3>{draft.label || 'Untitled node'}</h3></div><button className="icon-button" onClick={onClose} aria-label="Close settings"><X size={16} /></button></div><label className="field-label">Display name<input value={draft.label || ''} onChange={(event) => update('label', event.target.value)} /></label>{node.type === 'action' && <label className="field-label">Integration<select value={provider} onChange={(event) => update('provider', event.target.value)}><option value="slack">Slack</option><option value="gmail">Gmail</option><option value="discord">Discord</option><option value="google-sheets">Google Sheets</option></select></label>}{fieldsFor(provider).map(([key, label]) => <label className="field-label" key={key}>{label}{key === 'message' || key === 'description' ? <textarea rows={3} value={draft[key] || ''} onChange={(event) => update(key, event.target.value)} /> : <input value={draft[key] || ''} onChange={(event) => update(key, event.target.value)} />}</label>)}<div className="config-hint">Credentials are managed in <Link href="/integrations">Integrations</Link>.</div></section>;
}