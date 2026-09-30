export function describeAction(node) {
  return { nodeId: node.id, label: node.data?.label || node.type, provider: node.data?.provider || null, description: node.data?.description || '' };
}