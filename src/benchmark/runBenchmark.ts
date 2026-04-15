import { dijkstra, dijkstraWithMetrics } from "../algorithms/Dijkstra";
import { bellmanFord, bellmanFordWithMetrics } from "../algorithms/Bellman-Ford";
import type { DijkstraMetrics } from "../algorithms/Dijkstra";
import type { BellmanFordMetrics } from "../algorithms/Bellman-Ford";
import type { Graph } from "../algorithms/types";
import { graphHasNegativeEdge } from "../graph/graphAnalysis";

export type AlgorithmId = "dijkstra" | "bellmanFord";

/** Mede até um bloco levar ~minChunkMs; média = tempo do bloco / n. */
function measureAverageMs(fn: () => void, minChunkMs = 2): { avgMs: number; batchRuns: number } {
  let n = 1;
  const maxN = 50_000_000;
  for (;;) {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) fn();
    const elapsed = performance.now() - t0;
    if (elapsed >= minChunkMs || n >= maxN) {
      return { avgMs: elapsed / n, batchRuns: n };
    }
    n = Math.min(n * 4, maxN);
  }
}

export type BenchmarkAlgorithmResult = {
  algorithmId: AlgorithmId;
  label: string;
  skipped?: boolean;
  skipReason?: string;
  avgTimeMs?: number;
  avgTimeUs?: number;
  batchRuns?: number;
  dist?: number[];
  hasNegativeCycle?: boolean;
  dijkstraMetrics?: DijkstraMetrics;
  bellmanMetrics?: BellmanFordMetrics;
};

export type BenchmarkRunResult = {
  hasNegativeEdge: boolean;
  results: BenchmarkAlgorithmResult[];
};

export function runBenchmark(
  graph: Graph,
  source: number,
  selected: Record<AlgorithmId, boolean>
): BenchmarkRunResult {
  const hasNegativeEdge = graphHasNegativeEdge(graph);
  const results: BenchmarkAlgorithmResult[] = [];

  if (selected.dijkstra) {
    if (hasNegativeEdge) {
      results.push({
        algorithmId: "dijkstra",
        label: "Dijkstra",
        skipped: true,
        skipReason:
          "Existe aresta com peso negativo. Dijkstra exige pesos ≥ 0; o resultado não seria garantido.",
      });
    } else {
      const { avgMs, batchRuns } = measureAverageMs(() => dijkstra(graph, source));
      const { dist, metrics } = dijkstraWithMetrics(graph, source);
      results.push({
        algorithmId: "dijkstra",
        label: "Dijkstra",
        avgTimeMs: avgMs,
        avgTimeUs: avgMs * 1000,
        batchRuns,
        dist,
        dijkstraMetrics: metrics,
      });
    }
  }

  if (selected.bellmanFord) {
    const { avgMs, batchRuns } = measureAverageMs(() => bellmanFord(graph, source));
    const { dist, hasNegativeCycle, metrics } = bellmanFordWithMetrics(graph, source);
    results.push({
      algorithmId: "bellmanFord",
      label: "Bellman-Ford",
      avgTimeMs: avgMs,
      avgTimeUs: avgMs * 1000,
      batchRuns,
      dist,
      hasNegativeCycle,
      bellmanMetrics: metrics,
    });
  }

  return { hasNegativeEdge, results };
}
