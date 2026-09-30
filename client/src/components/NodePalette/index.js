import { GitBranch, Mail, MessageSquare, Play, Rows3, ShieldCheck } from 'lucide-react';

const nodeTypes = [
  { type: 'trigger', label: 'Trigger', icon: Play, color: 'mint' },
  { type: 'action', label: 'Action', icon: MessageSquare, color: 'blue' },
  { type: 'validation', label: 'Validation', icon: ShieldCheck, color: 'coral' },
  { type: 'gmail', label: 'Gmail', icon: Mail, color: 'amber' },
  { type: 'google-sheets', label: 'Sheets', icon: Rows3, color: 'green' },
  { type: 'condition', label: 'Branch', icon: GitBranch, color: 'violet' },
];

export default function NodePalette() {
  return <section className="palette-panel"><p className="panel-label">NODE LIBRARY</p><div className="palette-list">{nodeTypes.map(({ type, label, icon: Icon, color }) => <button className="palette-item" key={type} draggable onDragStart={(event) => event.dataTransfer.setData('application/relay-node', type)}><span className={`node-icon ${color}`}><Icon size={15} /></span><span>{label}</span><span className="drag-grip">⠿</span></button>)}</div><div className="palette-footnote">Drag a node onto the canvas</div></section>;
}