import type { Edge } from "reactflow";

/** Handles `source` no CustomNode (uma aresta sainte por lado, rotacionando). */
export const PRESET_SOURCE_HANDLES = [
  "top-source-1",
  "right-source-1",
  "bottom-source-1",
  "left-source-1",
] as const;

/** Handles `target` no CustomNode. */
export const PRESET_TARGET_HANDLES = [
  "top-target-1",
  "right-target-1",
  "bottom-target-1",
  "left-target-1",
] as const;

/** Contadores por índice de nó para distribuir arestas nos 4 lados. */
export function createHandleCounters() {
  const outSlot = new Map<number, number>();
  const inSlot = new Map<number, number>();

  const nextSource = (nodeIndex: number) => {
    const k = outSlot.get(nodeIndex) ?? 0;
    outSlot.set(nodeIndex, k + 1);
    return PRESET_SOURCE_HANDLES[k % 4];
  };

  const nextTarget = (nodeIndex: number) => {
    const k = inSlot.get(nodeIndex) ?? 0;
    inSlot.set(nodeIndex, k + 1);
    return PRESET_TARGET_HANDLES[k % 4];
  };

  return { nextSource, nextTarget };
}

/** Aplica handles distribuídos a uma lista de arestas já com source/target (ids node-i). */
export function assignDistributedHandles(edges: Edge[]): Edge[] {
  const { nextSource, nextTarget } = createHandleCounters();
  const nodeIdToIndex = (id: string): number => {
    const m = /^node-(\d+)$/.exec(id);
    return m ? parseInt(m[1], 10) : 0;
  };

  return edges.map((e) => {
    const u = nodeIdToIndex(e.source);
    const v = nodeIdToIndex(e.target);
    return {
      ...e,
      sourceHandle: nextSource(u),
      targetHandle: nextTarget(v),
    };
  });
}
