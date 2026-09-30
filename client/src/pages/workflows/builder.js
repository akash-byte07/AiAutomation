import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { addEdge, applyEdgeChanges, applyNodeChanges, Background, Controls, Handle, MiniMap, Position, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { ArrowLeft, Check, LoaderCircle, Play, Save, Sparkles } from 'lucide-react';
import Link from 'next/link';
import NodePalette from '@/components/NodePalette';
import NodeConfigPanel from '@/components/NodeConfigPanel';
import { api } from '@/services/api';
import { useWorkflowStore } from '@/store/workflowStore';

function describeGeneration(workflow) {
  if (workflow?.generatedBy === 'rules') return workflow.generationNote || 'Generated with local rules.';
  const providers = { openrouter: 'OpenRouter', gemini: 'Gemini' };
  return providers[workflow?.generatedBy] ? `Generated with ${providers[workflow.generatedBy]}.` : '';
}

function GraphNode({ data, type, selected }) {
  return <div className={`graph-node graph-${type} ${selected ? 'graph-selected' : ''}`}><Handle type="target" position={Position.Left} />{type !== 'trigger' && <span className="graph-port" />}<span className="graph-kind">{type === 'trigger' ? 'START' : type === 'validation' ? 'VERIFY' : (data.provider || 'ACTION').toUpperCase()}</span><b>{data.label || 'Untitled step'}</b><small>{data.description || (type === 'trigger' ? 'Manual trigger' : 'Configure this step')}</small><Handle type="source" position={Position.Right} /></div>;
}

function CanvasArea({ onSelect }) {
  const { screenToFlowPosition } = useReactFlow();
  const { nodes, edges, setNodes, setEdges } = useWorkflowStore();
  function onDrop(event) {
    event.preventDefault();
    const paletteType = event.dataTransfer.getData('application/relay-node');
    if (!paletteType) return;
    const provider = ['gmail', 'discord', 'google-sheets'].includes(paletteType) ? paletteType : paletteType === 'action' ? 'slack' : undefined;
    const type = ['trigger', 'validation'].includes(paletteType) ? paletteType : 'action';
    const label = paletteType === 'trigger' ? 'When this starts' : paletteType === 'validation' ? 'Confirm result' : paletteType === 'action' ? 'Send Slack message' : `Send ${paletteType} action`;
    const node = { id: `node-${crypto.randomUUID()}`, type, position: screenToFlowPosition({ x: event.clientX, y: event.clientY }), data: { label, provider, description: '' } };
    setNodes([...nodes, node]); onSelect(node);
  }
  const nodeTypes = useMemo(() => ({ trigger: GraphNode, action: GraphNode, validation: GraphNode }), []);
  return <div className="flow-surface" onDrop={onDrop} onDragOver={(event) => event.preventDefault()}><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={(changes) => setNodes(applyNodeChanges(changes, nodes))} onEdgesChange={(changes) => setEdges(applyEdgeChanges(changes, edges))} onConnect={(connection) => setEdges(addEdge({ ...connection, animated: true }, edges))} onNodeClick={(_, node) => onSelect(node)} fitView><Background color="#d4d8d1" gap={22} size={1} /><Controls position="bottom-left" /><MiniMap position="bottom-right" nodeColor={(node) => node.type === 'trigger' ? '#bfdc9a' : node.type === 'validation' ? '#f2aa8e' : '#a8c8df'} maskColor="rgba(244, 245, 239, 0.6)" /></ReactFlow>{!nodes.length && <div className="canvas-empty"><span className="eyebrow">START WITH A SENTENCE</span><p>Describe the handoff you want to automate.</p></div>}</div>;
}

function BuilderCanvas() {
  const router = useRouter();
  const { workflow, nodes, edges, setWorkflow, setNodes, reset } = useWorkflowStore();
  const [selected, setSelected] = useState(null);
  const [prompt, setPrompt] = useState('When I get a new customer inquiry, send the details to Slack and confirm it was recorded.');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const generationInfo = describeGeneration(workflow);
  const nodeTypes = useMemo(() => ({ trigger: GraphNode, action: GraphNode, validation: GraphNode }), []);

  useEffect(() => {
    if (router.query.id) api(`/workflows/${router.query.id}`).then(({ workflow: value }) => { setWorkflow(value); setPrompt(value.prompt || ''); }).catch((error) => setMessage(error.message));
    else reset();
  }, [router.query.id, reset, setWorkflow]);

  async function generate() {
    setBusy(true); setMessage('');
    try { const { workflow: value } = await api('/workflows/generate', { method: 'POST', body: JSON.stringify({ prompt }) }); setWorkflow(value); await router.replace(`/workflows/builder?id=${value.id}`, undefined, { shallow: true }); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function save() {
    setSaving(true); setMessage('');
    try {
      const values = { name: workflow?.name || prompt.slice(0, 48) || 'Untitled workflow', prompt, nodes, edges };
      const result = workflow?.id ? await api(`/workflows/${workflow.id}`, { method: 'PATCH', body: JSON.stringify(values) }) : await api('/workflows', { method: 'POST', body: JSON.stringify(values) });
      setWorkflow(result.workflow); if (!router.query.id) await router.replace(`/workflows/builder?id=${result.workflow.id}`, undefined, { shallow: true }); setMessage('Saved'); return result.workflow;
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  }

  async function run() {
    const savedWorkflow = await save();
    if (!savedWorkflow?.id) return;
    try { await api(`/workflows/${savedWorkflow.id}/run`, { method: 'POST' }); router.push('/executions'); }
    catch (error) { setMessage(error.message); }
  }

  function updateSelected(next) {
    setSelected(next);
    setNodes(nodes.map((node) => node.id === next.id ? next : node));
  }

  return <div className="builder-page"><header className="builder-topline"><Link href="/workflows" className="back-link"><ArrowLeft size={16} />Workflows</Link><span className="builder-separator">/</span><span className="builder-title">{workflow?.name || 'New workflow'}</span><span className="builder-save-state">{message === 'Saved' ? <><Check size={13} />Saved</> : message}</span><div className="builder-actions"><button className="quiet-button" onClick={save} disabled={saving || !nodes.length}>{saving ? <LoaderCircle size={15} className="spin" /> : <Save size={15} />}Save</button><button className="primary-button run-button" onClick={run} disabled={!nodes.length}><Play size={14} fill="currentColor" />Run workflow</button></div></header><div className="builder-workspace"><NodePalette /><section className="canvas-column"><div className="prompt-bar"><span className="prompt-spark"><Sparkles size={16} /></span><textarea aria-label="Workflow prompt" rows={1} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe what this workflow should do..." /><button className="generate-button" onClick={generate} disabled={busy || prompt.trim().length < 4}>{busy ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={15} />}{busy ? 'Building' : 'Generate graph'}</button></div>{generationInfo && <div className={`generation-status ${workflow?.generatedBy === 'rules' ? 'generation-fallback' : ''}`} role="status"><Sparkles size={13} /><span>{generationInfo}</span></div>}<div className="canvas-meta"><span>CANVAS <i /> {nodes.length} NODES <i /> {edges.length} CONNECTIONS</span><span>DRAG TO PAN · SCROLL TO ZOOM</span></div><ReactFlowProvider><CanvasArea onSelect={setSelected} /></ReactFlowProvider></section><NodeConfigPanel key={selected?.id || 'empty'} node={selected} onChange={updateSelected} onClose={() => setSelected(null)} /></div></div>;
}

export default function WorkflowBuilder() { return <BuilderCanvas />; }