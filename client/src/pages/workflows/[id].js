import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, ArrowRight, Play, Workflow } from 'lucide-react';
import { api } from '@/services/api';

export default function WorkflowDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [workflow, setWorkflow] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (id) api(`/workflows/${id}`).then(({ workflow: item }) => setWorkflow(item)).catch((problem) => setError(problem.message)); }, [id]);
  async function run() {
    setBusy(true);
    try { await api(`/workflows/${id}/run`, { method: 'POST' }); router.push('/executions'); }
    catch (problem) { setError(problem.message); setBusy(false); }
  }
  if (error) return <div className="page-error">{error}<Link href="/workflows">Return to workflows</Link></div>;
  if (!workflow) return <div className="boot-screen"><span className="pulse-dot" />Loading workflow</div>;
  return <div className="workflow-detail-page"><Link href="/workflows" className="back-link"><ArrowLeft size={16} />Workflows</Link><div className="page-heading workflow-detail-heading"><div><span className="eyebrow">WORKFLOW OVERVIEW</span><h1>{workflow.name}</h1><p>{workflow.prompt || 'No prompt description'} · Updated {new Date(workflow.updatedAt || workflow.createdAt).toLocaleDateString()}</p></div><div className="workflow-detail-actions"><Link className="quiet-button" href={`/workflows/builder?id=${workflow.id}`}>Edit graph <ArrowRight size={14} /></Link><button className="primary-button" onClick={run} disabled={busy}><Play size={14} fill="currentColor" />{busy ? 'Starting...' : 'Run workflow'}</button></div></div><section className="surface-section detail-graph-section"><div className="section-heading"><div><span className="eyebrow">WORKFLOW GRAPH</span><h2>{workflow.nodes?.length || 0} nodes <span>·</span> {workflow.edges?.length || 0} connections</h2></div><span className={`status-pill status-${workflow.status || 'draft'}`}>{workflow.status || 'draft'}</span></div><div className="detail-node-list">{workflow.nodes?.map((node, index) => <article className="detail-node" key={node.id}><span className={`detail-node-icon detail-${node.type}`}><Workflow size={15} /></span><div><small>STEP {String(index + 1).padStart(2, '0')} · {(node.data?.provider || node.type).toUpperCase()}</small><b>{node.data?.label || node.type}</b><p>{node.data?.description || 'No additional configuration.'}</p></div>{index < workflow.nodes.length - 1 && <ArrowRight className="detail-arrow" size={14} />}</article>)}</div></section></div>;
}