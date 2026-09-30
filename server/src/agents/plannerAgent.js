export function planExecution(workflow) {
  return {
    steps: workflow.nodes.filter((node) => node.type !== 'trigger').map((node) => ({ nodeId: node.id, label: node.data?.label || node.type, provider: node.data?.provider || null })),
    summary: `Prepared ${workflow.nodes.length} workflow nodes for execution.`,
  };
}