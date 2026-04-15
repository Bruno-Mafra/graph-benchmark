import { generateSparseGraph } from "../graph/generators";
import type { AlgorithmId } from "./runBenchmark";
import { runBenchmark } from "./runBenchmark";

/** Tamanhos |V| para a curva de crescimento (grafo esparso aleatório). */
export const GROWTH_VERTEX_COUNTS = [100, 500, 1000, 5000, 10000] as const;

export type GrowthCurvePoint = {
  vertexCount: number;
  dijkstraUs: number | null;
  bellmanFordUs: number | null;
};

export type GrowthCurveResult = {
  points: GrowthCurvePoint[];
};

/**
 * Para cada |V|, gera `generateSparseGraph(V)` e mede tempo médio (origem 0).
 * Não usa o grafo do editor — só CPU em memória.
 */
export async function runSparseGrowthCurve(
  selected: Record<AlgorithmId, boolean>
): Promise<GrowthCurveResult> {
  const points: GrowthCurvePoint[] = [];

  for (const V of GROWTH_VERTEX_COUNTS) {
    const graph = generateSparseGraph(V);
    const run = runBenchmark(graph, 0, selected);

    let dijkstraUs: number | null = null;
    let bellmanFordUs: number | null = null;

    for (const r of run.results) {
      if (r.skipped || r.avgTimeUs == null) continue;
      if (r.algorithmId === "dijkstra") dijkstraUs = r.avgTimeUs;
      if (r.algorithmId === "bellmanFord") bellmanFordUs = r.avgTimeUs;
    }

    points.push({ vertexCount: V, dijkstraUs, bellmanFordUs });

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  return { points };
}
