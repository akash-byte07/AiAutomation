import { create } from 'zustand';

export const useWorkflowStore = create((set) => ({
  workflow: null,
  nodes: [],
  edges: [],
  setWorkflow: (workflow) => set({ workflow, nodes: workflow?.nodes || [], edges: workflow?.edges || [] }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  reset: () => set({ workflow: null, nodes: [], edges: [] }),
}));