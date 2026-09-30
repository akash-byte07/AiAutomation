export function validateWorkflow(workflow) {
  if (!workflow.nodes?.length) return { valid: false, reason: 'Workflow has no nodes.' };
  const ids = new Set(workflow.nodes.map((node) => node.id));
  const invalidEdge = workflow.edges?.find((edge) => !ids.has(edge.source) || !ids.has(edge.target));
  return invalidEdge ? { valid: false, reason: 'A workflow connection points to a missing node.' } : { valid: true };
}