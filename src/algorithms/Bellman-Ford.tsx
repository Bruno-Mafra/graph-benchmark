import type { Graph } from "./types";
/**
 * Bellman-Ford
 * Detecta ciclo negativo
 * Complexidade: O(V * E)
 */
export function bellmanFord(graph: Graph, source: number) {
    const n = graph.length;
    const dist = new Array<number>(n).fill(Infinity);
  
    dist[source] = 0;
  
    // V-1 relaxamentos
    for (let i = 0; i < n - 1; i++) {
      let updated = false;
  
      for (let u = 0; u < n; u++) {
        if (dist[u] === Infinity) continue;
  
        for (const edge of graph[u]) {
          const v = edge.to;
          const w = edge.weight;
  
          if (dist[u] + w < dist[v]) {
            dist[v] = dist[u] + w;
            updated = true;
          }
        }
      }
  
      if (!updated) break;
    }
  
    // checar ciclo negativo
    for (let u = 0; u < n; u++) {
      if (dist[u] === Infinity) continue;
  
      for (const edge of graph[u]) {
        const v = edge.to;
        const w = edge.weight;
  
        if (dist[u] + w < dist[v]) {
          return { dist, hasNegativeCycle: true };
        }
      }
    }
  
    return { dist, hasNegativeCycle: false };
  }

export type BellmanFordMetrics = {
  successfulRelaxations: number;
  /** Quantas rodadas externas (até V-1) foram executadas. */
  outerIterations: number;
  /** Parou antes de V-1 porque não houve atualização. */
  earlyStopped: boolean;
};

/**
 * Bellman-Ford com métricas (uma passagem extra de contagem no relaxamento).
 */
export function bellmanFordWithMetrics(
  graph: Graph,
  source: number
): {
  dist: number[];
  hasNegativeCycle: boolean;
  metrics: BellmanFordMetrics;
} {
  const n = graph.length;
  const dist = new Array<number>(n).fill(Infinity);

  dist[source] = 0;

  let successfulRelaxations = 0;
  let outerIterations = 0;
  let earlyStopped = false;

  for (let i = 0; i < n - 1; i++) {
    let updated = false;
    outerIterations++;

    for (let u = 0; u < n; u++) {
      if (dist[u] === Infinity) continue;

      for (const edge of graph[u]) {
        const v = edge.to;
        const w = edge.weight;

        if (dist[u] + w < dist[v]) {
          dist[v] = dist[u] + w;
          updated = true;
          successfulRelaxations++;
        }
      }
    }

    if (!updated) {
      earlyStopped = true;
      break; // remover para rodar V-1 iterações
    }
  }

  for (let u = 0; u < n; u++) {
    if (dist[u] === Infinity) continue;

    for (const edge of graph[u]) {
      const v = edge.to;
      const w = edge.weight;

      if (dist[u] + w < dist[v]) {
        return {
          dist,
          hasNegativeCycle: true,
          metrics: {
            successfulRelaxations,
            outerIterations,
            earlyStopped: false,
          },
        };
      }
    }
  }

  return {
    dist,
    hasNegativeCycle: false,
    metrics: {
      successfulRelaxations,
      outerIterations,
      earlyStopped,
    },
  };
}