import { MarkerType } from "reactflow";
import type { Node, Edge } from "reactflow";
import type { Graph } from "../algorithms/types";
import {
  GRID_LAYOUT_CELL,
  layoutNodesCircle,
  layoutNodesGrid,
  layoutNodesLine,
} from "./layout";
import {
  addNegativeCycle,
  generateDenseGraph,
  generateDisconnected,
  generateGridGraph,
  generateLinearGraph,
  generateNegativeWeights,
  generateSparseGraph,
} from "./generators";

export type PresetKind =
  | "sparse"
  | "dense"
  | "linear"
  | "grid"
  | "negativeWeights"
  | "negativeCycle"
  | "disconnected";

export function graphToReactFlowEdges(g: Graph): Edge[] {
  const edges: Edge[] = [];
  let seq = 0;
  for (let u = 0; u < g.length; u++) {
    for (const { to, weight } of g[u]) {
      edges.push({
        id: `gen-e-${seq++}`,
        source: `node-${u}`,
        target: `node-${to}`,
        type: "weighted",
        data: { weight },
        markerEnd: { type: MarkerType.ArrowClosed },
      });
    }
  }
  return edges;
}

/**
 * Uma aresta visual por par ordenado {u,v}: usa `source = node-min` e `target = node-max`
 * e marca `bidirectional` para o conversor reconstruir os dois sentidos no grafo.
 * Evita duas setas sobre o mesmo segmento (útil na grade/mapa).
 */
export function graphToReactFlowEdgesUndirectedVisual(g: Graph): Edge[] {
  const edges: Edge[] = [];
  let seq = 0;
  for (let u = 0; u < g.length; u++) {
    for (const { to, weight } of g[u]) {
      if (u >= to) continue;
      edges.push({
        id: `gen-e-${seq++}`,
        source: `node-${u}`,
        target: `node-${to}`,
        type: "weighted",
        data: { weight, bidirectional: true as const },
        markerEnd: { type: MarkerType.ArrowClosed },
      });
    }
  }
  return edges;
}

export function makeNodesFromCount(n: number): Node[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `node-${i}`,
    type: "circular" as const,
    position: { x: 0, y: 0 },
    data: { label: `${i}` },
  }));
}

export type PresetParams = {
  n: number;
  rows: number;
  cols: number;
};

export function buildPresetGraph(
  kind: PresetKind,
  params: PresetParams
): { nodes: Node[]; edges: Edge[] } {
  const { n, rows, cols } = params;
  let g: Graph;

  switch (kind) {
    case "sparse":
      g = generateSparseGraph(n);
      break;
    case "dense":
      g = generateDenseGraph(n);
      break;
    case "linear":
      g = generateLinearGraph(n);
      break;
    case "grid":
      g = generateGridGraph(rows, cols);
      break;
    case "negativeWeights":
      g = generateNegativeWeights(n);
      break;
    case "negativeCycle": {
      const nv = Math.max(3, n);
      g = generateSparseGraph(nv);
      addNegativeCycle(g);
      break;
    }
    case "disconnected":
      g = generateDisconnected(n);
      break;
    default:
      g = generateSparseGraph(8);
  }

  const nodes = makeNodesFromCount(g.length);
  const edges =
    kind === "grid"
      ? graphToReactFlowEdgesUndirectedVisual(g)
      : graphToReactFlowEdges(g);

  let laidOut: Node[];
  switch (kind) {
    case "linear":
      laidOut = layoutNodesLine(nodes);
      break;
    case "grid":
      laidOut = layoutNodesGrid(nodes, cols, GRID_LAYOUT_CELL);
      break;
    default:
      laidOut = layoutNodesCircle(nodes);
  }

  return { nodes: laidOut, edges };
}
