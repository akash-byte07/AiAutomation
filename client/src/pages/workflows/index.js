import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, Search, Workflow } from 'lucide-react';
import { api } from '@/services/api';

export default function WorkflowsPage() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { api('/workflows').then((data) => setItems(data.workflows)).finally(() => setLoading(false)); }, []);
  const filtered = items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  return <div className="listing-page"><div className="page-heading"><div><span className="eyebrow">BUILD AND MAINTAIN</span><h1>Workflows</h1><p>Manage the automations running across your workspace.</p></div><Link className="primary-button" href="/workflows/builder"><Plus size={17} />New workflow</Link></div><div className="list-toolbar"><label className="search-field"><Search size={16} /><input placeholder="Find a workflow" value={query} onChange={(event) => setQuery(event.target.value)} /></label><span>{items.length} workflows</span></div><section className="workflow-table listing-table">{loading ? <div className="skeleton-list"><i /><i /><i /></div> : filtered.length ? filtered.map((workflow, index) => <Link href={`/workflows/${workflow.id}`} className="workflow-row" key={workflow.id}><span className={`workflow-symbol symbol-${index % 4}`}><Workflow size={17} /></span><span className="workflow-name"><b>{workflow.name}</b><small>{workflow.nodes?.length || 0} nodes · {new Date(workflow.updatedAt || workflow.createdAt).toLocaleDateString()}</small></span><span className={`status-pill status-${workflow.status || 'draft'}`}>{workflow.status || 'draft'}</span><ArrowRight className="row-arrow" size={15} /></Link>) : <div className="empty-state"><span className="empty-icon"><Workflow size={21} /></span><h3>{query ? 'No matching workflows' : 'Build your first workflow'}</h3><p>{query ? 'Try a different search term.' : 'Describe a process and Relay will sketch the first graph.'}</p>{!query && <Link href="/workflows/builder" className="outline-button"><Plus size={15} />Create workflow</Link>}</div>}</section></div>;
}