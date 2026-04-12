import type { Node, Edge as RFEdge } from "reactflow";
import type { Graph } from "../algorithms/types";

export type ReactFlowToGraphResult =
  | {
      ok: true;
      graph: Graph;
      /** `nodeIds[i]` é o id do React Flow do vértice `i` (ordem do editor). */
      nodeIds: string[];
    }
  | { ok: false; error: string };

/**
 * Converte nós e arestas do React Flow para lista de adjacência `Graph`
 * (`graph[u]` = arestas saindo de `u` com `{ to, weight }`).
 * A ordem dos vértices segue a ordem do array `nodes`.
 */
export function reactFlowToAdjacencyList(
  nodes: Node[],
  edges: RFEdge[]
): ReactFlowToGraphResult {
  if (nodes.length === 0) {
    return { ok: false, error: "Adicione pelo menos um nó ao grafo." };
  }

  const nodeIds = nodes.map((n) => n.id);
  const idToIndex = new Map<string, number>();
  nodeIds.forEach((id, i) => idToIndex.set(id, i));

  const n = nodes.length;
  const graph: Graph = Array.from({ length: n }, () => []);

  for (const e of edges) {
    const u = idToIndex.get(e.source);
    const v = idToIndex.get(e.target);
    if (u === undefined || v === undefined) continue;

    const raw = e.data as { weight?: number; bidirectional?: boolean } | undefined;
    const w =
      typeof raw?.weight === "number" && Number.isFinite(raw.weight)
        ? raw.weight
        : 1;

    graph[u].push({ to: v, weight: w });
    if (raw?.bidirectional && u !== v) {
      graph[v].push({ to: u, weight: w });
    }
  }

  return { ok: true, graph, nodeIds };
}

