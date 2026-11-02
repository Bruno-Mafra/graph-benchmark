import type { Node, Edge as RFEdge } from "reactflow";
import { makeEditorEdge } from "./editorModel";
import type { EditorEdgeData, EditorNodeData } from "./editorModel";
import type { GeneratedGraph } from "./generators";
import { chooseLayout, computeLayout } from "./layout";
import type { LayoutKind } from "./layout";
import { topologicalOrder } from "./analysis";
import { buildInstance } from "./types";

export const NODE_TYPE = "circular";
/** Diâmetro do nó no editor (px); posição do React Flow é o canto superior esquerdo. */
export const NODE_SIZE = 44;

/** Aplica posições (centros) a nós do editor. */
export function applyPositions(nodes: Node[], centers: Float64Array): Node[] {
  return nodes.map((n, i) => ({
    ...n,
    position: { x: centers[2 * i] - NODE_SIZE / 2, y: centers[2 * i + 1] - NODE_SIZE / 2 },
  }));
}

/** Arcos (índices) das arestas do editor; não direcionadas contam nos dois sentidos. */
export function editorArcs(nodes: Node[], edges: RFEdge[]): Array<[number, number]> {
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const arcs: Array<[number, number]> = [];
  for (const e of edges) {
    const u = index.get(e.source);
    const v = index.get(e.target);
    if (u === undefined || v === undefined) continue;
    arcs.push([u, v]);
    if ((e.data as EditorEdgeData | undefined)?.bidirectional) arcs.push([v, u]);
  }
  return arcs;
}

/** Resolve "auto" para um layout concreto, conforme o grafo. */
export function resolveLayout(kind: LayoutKind, n: number, arcs: Array<[number, number]>): Exclude<LayoutKind, "auto"> {
  if (kind !== "auto") return kind;
  const adj = Array.from({ length: n }, () => [] as { to: number; weight: number }[]);
  for (const [u, v] of arcs) adj[u].push({ to: v, weight: 1 });
  return chooseLayout(n, topologicalOrder(buildInstance(adj)) !== null);
}

/** Reposiciona os nós do editor com o layout escolhido. */
export function layoutEditorNodes(nodes: Node[], edges: RFEdge[], kind: LayoutKind): Node[] {
  const arcs = editorArcs(nodes, edges);
  return applyPositions(nodes, computeLayout(resolveLayout(kind, nodes.length, arcs), nodes.length, arcs));
}

/** Converte um grafo gerado em nós/arestas do editor, com layout automático se ele não trouxer posições. */
export function generatedToEditor(gen: GeneratedGraph): { nodes: Node<EditorNodeData>[]; edges: RFEdge<EditorEdgeData>[] } {
  const nodes: Node<EditorNodeData>[] = Array.from({ length: gen.n }, (_, i) => ({
    id: `node-${i}`,
    type: NODE_TYPE,
    position: { x: 0, y: 0 },
    data: { label: String(i) },
  }));
  const edges = gen.edges.map((e, i) => makeEditorEdge(`e-${i}`, `node-${e.u}`, `node-${e.v}`, e.w, e.bidirectional));
  if (gen.positions) return { nodes: applyPositions(nodes, gen.positions) as Node<EditorNodeData>[], edges };
  return { nodes: layoutEditorNodes(nodes, edges, "auto") as Node<EditorNodeData>[], edges };
}
