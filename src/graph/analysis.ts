import type { GraphInstance } from "./types";
import { arcCount } from "./types";

export type Directedness = "empty" | "directed" | "undirected" | "mixed";

export type NegativeCycleInfo =
  | { status: "none" }
  | { status: "found"; cycle: number[] }
  /** Grafo grande demais para verificar sem atrasar a interface. */
  | { status: "unchecked" };

export type GraphAnalysis = {
  n: number;
  /** Arcos dirigidos (aresta não direcionada conta 2). */
  arcs: number;
  directedEdges: number;
  undirectedEdges: number;
  directedness: Directedness;
  minWeight: number | null;
  maxWeight: number | null;
  hasNegative: boolean;
  hasZero: boolean;
  /** Peso comum a todos os arcos; null se há pesos diferentes ou não há arcos. */
  uniformWeight: number | null;
  /** Acíclico considerando os arcos (aresta não direcionada = ciclo de 2). */
  isDag: boolean;
  /** Um ciclo dirigido de exemplo, quando não é DAG. */
  cycleExample: number[] | null;
  negativeCycle: NegativeCycleInfo;
  /** Componentes fracamente conexas (ignorando a direção). */
  weakComponents: number;
};

/** Limite de trabalho (rodadas × arcos) para procurar ciclo negativo. */
const NEGATIVE_CYCLE_WORK_LIMIT = 60_000_000;

export function analyzeGraph(
  g: GraphInstance,
  edgeCounts: { directed: number; undirected: number } = { directed: arcCount(g), undirected: 0 }
): GraphAnalysis {
  const m = arcCount(g);
  let min = Infinity;
  let max = -Infinity;
  let hasZero = false;
  for (let k = 0; k < m; k++) {
    const w = g.weights[k];
    if (w < min) min = w;
    if (w > max) max = w;
    if (w === 0) hasZero = true;
  }
  const hasNegative = m > 0 && min < 0;
  const { directed, undirected } = edgeCounts;
  const directedness: Directedness =
    directed + undirected === 0 ? "empty" : undirected === 0 ? "directed" : directed === 0 ? "undirected" : "mixed";

  const cycleExample = findDirectedCycle(g);
  return {
    n: g.n,
    arcs: m,
    directedEdges: directed,
    undirectedEdges: undirected,
    directedness,
    minWeight: m ? min : null,
    maxWeight: m ? max : null,
    hasNegative,
    hasZero,
    uniformWeight: m && min === max ? min : null,
    isDag: cycleExample === null,
    cycleExample,
    negativeCycle: hasNegative ? findNegativeCycle(g) : { status: "none" },
    weakComponents: countWeakComponents(g),
  };
}

/** Ordem topológica (Kahn); null se há ciclo. */
export function topologicalOrder(g: GraphInstance): Int32Array | null {
  const { n, offsets, targets } = g;
  const indeg = new Int32Array(n);
  for (let k = 0; k < targets.length; k++) indeg[targets[k]]++;
  const order = new Int32Array(n);
  let head = 0;
  let tail = 0;
  for (let v = 0; v < n; v++) if (indeg[v] === 0) order[tail++] = v;
  while (head < tail) {
    const u = order[head++];
    for (let k = offsets[u]; k < offsets[u + 1]; k++) {
      if (--indeg[targets[k]] === 0) order[tail++] = targets[k];
    }
  }
  return tail === n ? order : null;
}

/** Algum ciclo dirigido (lista de vértices, sem repetir o primeiro), ou null. */
export function findDirectedCycle(g: GraphInstance): number[] | null {
  if (topologicalOrder(g)) return null;
  const { n, offsets, targets } = g;
  // DFS iterativa: 0 = branco, 1 = na pilha, 2 = concluído.
  const color = new Uint8Array(n);
  const parent = new Int32Array(n).fill(-1);
  const edgeIdx = new Int32Array(n);
  const stack = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (color[s]) continue;
    let top = 0;
    stack[top++] = s;
    color[s] = 1;
    edgeIdx[s] = offsets[s];
    while (top > 0) {
      const u = stack[top - 1];
      if (edgeIdx[u] < offsets[u + 1]) {
        const v = targets[edgeIdx[u]++];
        if (color[v] === 1) {
          const cycle = [v];
          for (let x = u; x !== v; x = parent[x]) cycle.push(x);
          // Montado de trás para frente: inverte para seguir o sentido dos arcos.
          return [v, ...cycle.slice(1).reverse()];
        }
        if (color[v] === 0) {
          color[v] = 1;
          parent[v] = u;
          edgeIdx[v] = offsets[v];
          stack[top++] = v;
        }
      } else {
        color[u] = 2;
        top--;
      }
    }
  }
  return null;
}

/**
 * Ciclo negativo em QUALQUER parte do grafo: Bellman-Ford a partir de uma
 * origem virtual ligada a todos com peso 0. Se ainda há relaxação na rodada n,
 * segue os predecessores n vezes (garante estar no ciclo) e extrai o ciclo.
 */
export function findNegativeCycle(g: GraphInstance): NegativeCycleInfo {
  const { n, offsets, targets, weights } = g;
  const m = targets.length;
  if ((n + 1) * Math.max(1, m) > NEGATIVE_CYCLE_WORK_LIMIT) return { status: "unchecked" };
  const dist = new Float64Array(n);
  const pred = new Int32Array(n).fill(-1);
  let last = -1;
  for (let round = 0; round < n; round++) {
    last = -1;
    for (let u = 0; u < n; u++) {
      const du = dist[u];
      for (let k = offsets[u]; k < offsets[u + 1]; k++) {
        const v = targets[k];
        if (du + weights[k] < dist[v]) {
          dist[v] = du + weights[k];
          pred[v] = u;
          last = v;
        }
      }
    }
    if (last === -1) return { status: "none" };
  }
  let x = last;
  for (let i = 0; i < n; i++) x = pred[x];
  const cycle = [x];
  for (let v = pred[x]; v !== x; v = pred[v]) cycle.push(v);
  return { status: "found", cycle: cycle.reverse() };
}

function countWeakComponents(g: GraphInstance): number {
  const parent = new Int32Array(g.n);
  for (let i = 0; i < g.n; i++) parent[i] = i;
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  let comps = g.n;
  for (let u = 0; u < g.n; u++) {
    for (let k = g.offsets[u]; k < g.offsets[u + 1]; k++) {
      const a = find(u);
      const b = find(g.targets[k]);
      if (a !== b) {
        parent[a] = b;
        comps--;
      }
    }
  }
  return comps;
}
