import { MarkerType } from "reactflow";
import type { Node, Edge as RFEdge } from "reactflow";
import type { Graph } from "./types";

/** Dados de uma aresta do editor. */
export type EditorEdgeData = {
  weight: number;
  /** Não direcionada: vale nos dois sentidos com o mesmo peso. */
  bidirectional?: boolean;
};

export type EditorNodeData = { label: string };

export function edgeWeight(e: RFEdge): number {
  const w = (e.data as Partial<EditorEdgeData> | undefined)?.weight;
  return typeof w === "number" && Number.isFinite(w) ? w : 1;
}

export function edgeIsBidirectional(e: RFEdge): boolean {
  return (e.data as Partial<EditorEdgeData> | undefined)?.bidirectional === true;
}

export function nodeLabel(n: Node): string {
  const l = (n.data as Partial<EditorNodeData> | undefined)?.label;
  return typeof l === "string" ? l : n.id;
}

export function makeEditorEdge(
  id: string,
  source: string,
  target: string,
  weight: number,
  bidirectional: boolean
): RFEdge<EditorEdgeData> {
  return {
    id,
    source,
    target,
    type: "weighted",
    data: bidirectional ? { weight, bidirectional: true } : { weight },
    markerEnd: bidirectional ? undefined : { type: MarkerType.ArrowClosed },
  };
}

export type EditorGraph = {
  graph: Graph;
  /** `nodeIds[i]` = id do nó do editor que virou o vértice i. */
  nodeIds: string[];
  labels: string[];
  /** (x, y) intercalados — centro aproximado de cada nó. */
  positions: Float64Array;
  /** Arestas do editor que referenciam nós inexistentes (ignoradas). */
  danglingEdges: number;
};

/**
 * Converte o grafo do editor em lista de adjacência. Vértices seguem a ordem
 * de `nodes`; aresta não direcionada vira dois arcos com o mesmo peso. Nada é
 * "corrigido": pesos negativos, ciclos etc. chegam como estão.
 */
export function editorToGraph(nodes: Node[], edges: RFEdge[]): EditorGraph {
  const idToIndex = new Map<string, number>();
  nodes.forEach((n, i) => idToIndex.set(n.id, i));
  const graph: Graph = nodes.map(() => []);
  let danglingEdges = 0;

  for (const e of edges) {
    const u = idToIndex.get(e.source);
    const v = idToIndex.get(e.target);
    if (u === undefined || v === undefined) {
      danglingEdges++;
      continue;
    }
    const w = edgeWeight(e);
    graph[u].push({ to: v, weight: w });
    if (edgeIsBidirectional(e) && u !== v) graph[v].push({ to: u, weight: w });
  }

  const positions = new Float64Array(nodes.length * 2);
  nodes.forEach((n, i) => {
    positions[2 * i] = n.position.x;
    positions[2 * i + 1] = n.position.y;
  });

  return {
    graph,
    nodeIds: nodes.map((n) => n.id),
    labels: nodes.map(nodeLabel),
    positions,
    danglingEdges,
  };
}

/**
 * Assinatura semântica (vértices, arestas, pesos, direção). Mudar só posições
 * ou rótulos não a altera; serve para descartar resultados quando o grafo muda.
 */
export function semanticSignature(nodes: Node[], edges: RFEdge[]): string {
  let h = 2166136261;
  const mix = (s: string) => {
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  };
  for (const n of nodes) mix(n.id + "|");
  for (const e of edges) mix(`${e.source}>${e.target}:${edgeWeight(e)}:${edgeIsBidirectional(e) ? 1 : 0};`);
  return `${nodes.length}/${edges.length}/${(h >>> 0).toString(36)}`;
}
