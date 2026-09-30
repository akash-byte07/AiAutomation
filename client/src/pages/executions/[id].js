import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, CirclePause, CirclePlay, RefreshCw, XCircle } from 'lucide-react';
import { api } from '@/services/api';
import { connectSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';

const agentNames = { planner: 'Planner', execution: 'Execution', validation: 'Validation', recovery: 'Recovery', monitoring: 'Monitoring' };

export default function ExecutionDetail() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const [execution, setExecution] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!id) return;
    api(`/executions/${id}`).then(async ({ execution: result }) => { setExecution(result); const flows = await api('/workflows'); setWorkflow(flows.workflows.find((item) => item.id === result.workflowId)); }).catch((problem) => setError(problem.message));
    const socket = connectSocket(token);
    socket.on('execution:event', (event) => { if (event.executionId === id) setExecution((current) => current ? { ...current, events: [...(current.events || []).filter((item) => item.id !== event.id), event] } : current); });
    socket.on('execution:updated', (updated) => { if (updated.id === id) setExecution((current) => ({ ...current, ...updated })); });
    return () => socket.disconnect();
  }, [id, token]);

  async function control(action) {
    try { const result = await api(`/executions/${id}/${action}`, { method: 'POST' }); setExecution(result.execution); }
    catch (problem) { setError(problem.message); }
  }

  if (error && !execution) return <div className="page-error">{error}<Link href="/executions">Return to executions</Link></div>;
  return <div className="execution-detail-page"><Link href="/executions" className="back-link"><ArrowLeft size={16} />Execution history</Link><div className="page-heading execution-detail-heading"><div><span className="eyebrow">EXECUTION DETAIL</span><h1>{workflow?.name || 'Workflow run'}</h1><p>{execution ? `Started ${new Date(execution.createdAt).toLocaleString()} · ${execution.events?.length || 0} audit events` : 'Loading execution...'}</p></div>{execution && <div className="execution-controls">{execution.status === 'running' && <button className="quiet-button" onClick={() => control('pause')}><CirclePause size={16} />Pause</button>}{execution.status === 'paused' && <button className="quiet-button" onClick={() => control('resume')}><CirclePlay size={16} />Resume</button>}{['queued', 'running', 'paused'].includes(execution.status) && <button className="danger-button" onClick={() => control('cancel')}><XCircle size={15} />Cancel</button>}</div>}</div>{error && <div className="inline-error">{error}</div>}<div className="execution-summary surface-section"><span className={`status-pill status-${execution?.status || 'queued'}`}>{execution?.status || 'loading'}</span><span>Run ID <code>{id}</code></span><span>Started {execution?.startedAt ? new Date(execution.startedAt).toLocaleTimeString() : '—'}</span><button className="icon-button" aria-label="Refresh" onClick={() => api(`/executions/${id}`).then(({ execution: value }) => setExecution(value))}><RefreshCw size={15} /></button></div><section className="surface-section timeline-section"><div className="section-heading"><div><span className="eyebrow">AGENT EVENT STREAM</span><h2>Run timeline</h2></div><span className="live-indicator"><i />STREAMING</span></div><div className="timeline">{execution?.events?.length ? execution.events.map((event, index) => <article className="timeline-event" key={event.id || `${event.agent}-${index}`}><span className={`timeline-marker marker-${event.agent}`} /><div className="timeline-content"><div className="timeline-event-heading"><span className={`agent-badge agent-${event.agent}`}>{agentNames[event.agent] || event.agent}</span><span className="event-time">{new Date(event.createdAt).toLocaleTimeString()}</span></div><b>{event.message}</b><small>{event.event}</small>{event.metadata?.code && <code className="event-code">{event.metadata.code}</code>}</div></article>) : <div className="empty-activity"><RefreshCw size={18} /><span>Waiting for the first agent event...</span></div>}</div></section></div>;
}