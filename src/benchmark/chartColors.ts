import type { AlgorithmId } from "./runBenchmark";

/** Cores estáveis por algoritmo (gráficos e barras de ranking). */
export const ALGORITHM_CHART_COLORS: Record<AlgorithmId, string> = {
  dijkstra: "#5b8cff",
  bellmanFord: "#e8a54b",
};

const FALLBACK = ["#7dd3a8", "#c084fc", "#f472b6", "#94a3b8"];

export function chartColorForAlgorithm(
  id: AlgorithmId,
  fallbackIndex: number
): string {
  return ALGORITHM_CHART_COLORS[id] ?? FALLBACK[fallbackIndex % FALLBACK.length];
}
