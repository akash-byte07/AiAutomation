import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CirclePlay, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import { connectSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((state) => state.token);
  useEffect(() => {
    Promise.all([api('/executions'), api('/workflows')]).then(([runs, flows]) => { setExecutions(runs.executions); setWorkflows(flows.workflows); }).finally(() => setLoading(false));
    const socket = connectSocket(token);
    socket.on('execution:updated', (updated) => setExecutions((current) => [updated, ...current.filter((run) => run.id !== updated.id)]));
    return () => socket.disconnect();
  }, [token]);
  return <div className="listing-page"><div className="page-heading"><div><span className="eyebrow">OBSERVE EVERY STEP</span><h1>Executions</h1><p>Inspect agent activity, outcomes, and recovery events.</p></div><span className="live-indicator"><i />LIVE UPDATES</span></div><section className="surface-section execution-history"><div className="section-heading"><div><span className="eyebrow">RUN HISTORY</span><h2>{executions.length} total runs</h2></div><button className="icon-button" aria-label="Refresh executions" onClick={() => api('/executions').then((data) => setExecutions(data.executions))}><RefreshCw size={16} /></button></div>{loading ? <div className="skeleton-list"><i /><i /><i /></div> : executions.length ? executions.map((run) => <Link href={`/executions/${run.id}`} className="history-row" key={run.id}><span className={`execution-dot dot-${run.status}`} /><div className="history-main"><b>{workflows.find((workflow) => workflow.id === run.workflowId)?.name || 'Workflow run'}</b><small>{new Date(run.createdAt).toLocaleString()} · {run.events?.length || 0} events</small></div><span className={`status-pill status-${run.status}`}>{run.status}</span><ArrowRight size={15} className="row-arrow" /></Link>) : <div className="empty-state"><span className="empty-icon"><CirclePlay size={21} /></span><h3>No executions yet</h3><p>Run a workflow to see the agent chain and its event trail here.</p><Link href="/workflows" className="outline-button">Browse workflows <ArrowRight size={15} /></Link></div>}</section></div>;
}