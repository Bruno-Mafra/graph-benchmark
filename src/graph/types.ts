/** Arco dirigido u → to com peso (lista de adjacência: `graph[u]`). */
export type Edge = { to: number; weight: number };
/** Lista de adjacência: formato de construção (geradores, testes). */
export type Graph = Edge[][];

/**
 * Representação usada pelos algoritmos: CSR (compressed sparse row) com os
 * arcos de saída e, também, os de entrada (necessários para buscas reversas,
 * como no Dijkstra bidirecional). Montada uma vez, FORA da medição de tempo,
 * e nunca modificada pelos algoritmos.
 */
export type GraphInstance = {
  n: number;
  /** Arcos de saída de u: índices offsets[u] .. offsets[u+1]-1. */
  offsets: Int32Array;
  targets: Int32Array;
  weights: Float64Array;
  /** Arcos de entrada de v: rOffsets[v] .. rOffsets[v+1]-1 (origem em rSources). */
  rOffsets: Int32Array;
  rSources: Int32Array;
  rWeights: Float64Array;
  /** Posições (x, y) intercaladas, usadas pela heurística do A*; null se ausentes. */
  positions: Float64Array | null;
  /**
   * Fator c da heurística euclidiana do A*: maior c com c·dist(u, v) ≤ w(u, v)
   * para todo arco. Pré-processamento feito uma vez, fora da medição (como a
   * própria lista de adjacência); 0 sem posições ou com pesos negativos/zero.
   */
  heuristicScale: number;
};

export function arcCount(g: GraphInstance): number {
  return g.targets.length;
}

/** Monta a instância CSR a partir de uma lista de adjacência. */
export function buildInstance(graph: Graph, positions: Float64Array | null = null): GraphInstance {
  const n = graph.length;
  const offsets = new Int32Array(n + 1);
  for (let u = 0; u < n; u++) offsets[u + 1] = offsets[u] + graph[u].length;
  const m = offsets[n];
  const targets = new Int32Array(m);
  const weights = new Float64Array(m);
  const inDeg = new Int32Array(n);
  for (let u = 0; u < n; u++) {
    let k = offsets[u];
    for (const e of graph[u]) {
      targets[k] = e.to;
      weights[k] = e.weight;
      inDeg[e.to]++;
      k++;
    }
  }
  const rOffsets = new Int32Array(n + 1);
  for (let v = 0; v < n; v++) rOffsets[v + 1] = rOffsets[v] + inDeg[v];
  const fill = rOffsets.slice(0, n);
  const rSources = new Int32Array(m);
  const rWeights = new Float64Array(m);
  for (let u = 0; u < n; u++) {
    for (let k = offsets[u]; k < offsets[u + 1]; k++) {
      const p = fill[targets[k]]++;
      rSources[p] = u;
      rWeights[p] = weights[k];
    }
  }
  const heuristicScale = positions ? euclideanScale(n, offsets, targets, weights, positions) : 0;
  return { n, offsets, targets, weights, rOffsets, rSources, rWeights, positions, heuristicScale };
}

/**
 * Maior c tal que c·dist_euclidiana(u, v) ≤ w(u, v) para TODO arco. Com ele,
 * h(v) = c·dist(v, destino) é admissível e consistente (desigualdade
 * triangular). Arco de peso ≤ 0 entre pontos distintos força c = 0.
 */
function euclideanScale(
  n: number,
  offsets: Int32Array,
  targets: Int32Array,
  weights: Float64Array,
  pos: Float64Array
): number {
  let c = Infinity;
  for (let u = 0; u < n; u++) {
    for (let k = offsets[u]; k < offsets[u + 1]; k++) {
      const v = targets[k];
      const dx = pos[2 * v] - pos[2 * u];
      const dy = pos[2 * v + 1] - pos[2 * u + 1];
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0 && weights[k] / d < c) c = weights[k] / d;
    }
  }
  return Number.isFinite(c) ? Math.max(0, c) : 0;
}

/** Peso do arco u → v (o menor, se houver arcos paralelos); undefined se não existe. */
export function arcWeight(g: GraphInstance, u: number, v: number): number | undefined {
  let best: number | undefined;
  for (let k = g.offsets[u]; k < g.offsets[u + 1]; k++) {
    if (g.targets[k] === v && (best === undefined || g.weights[k] < best)) best = g.weights[k];
  }
  return best;
}
