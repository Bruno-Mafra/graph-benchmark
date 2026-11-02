import type { MazeRunSummary, MazeSolveResult } from "./types";

/**
 * Custo ótimo de referência = custo do Dijkstra, se ele foi executado e achou
 * caminho. `null` = sem referência válida (gap não é calculado).
 */
export function referenceOptimalCost(results: MazeSolveResult[]): number | null {
  const d = results.find((r) => r.algorithmId === "dijkstra");
  return d && d.status === "found" ? d.pathCost : null;
}

/**
 * Gap (%) = (custo − ótimo) / ótimo × 100.
 * `null` quando não há custo, não há referência, ou a referência é 0 com custo
 * diferente de 0 (divisão indefinida). Ótimo 0 e custo 0 → 0%.
 */
export function computeGap(cost: number | null, optimal: number | null): number | null {
  if (cost == null || optimal == null) return null;
  if (optimal === 0) return cost === 0 ? 0 : null;
  return ((cost - optimal) / optimal) * 100;
}

export type OptimalityVerdict =
  /** Algoritmo garante o ótimo (teoria) e o resultado bate com a referência (ou não há referência). */
  | "guaranteed"
  /** Sem garantia teórica, mas nesta execução atingiu o custo ótimo. */
  | "observed-optimal"
  /** Custo acima do ótimo. */
  | "suboptimal"
  /** Sem garantia e sem referência para comparar. */
  | "unknown"
  | "no-path";

/** Tolerância para comparar custos de ponto flutuante (pesos futuros). */
const EPS = 1e-9;

export function optimalityVerdict(result: MazeSolveResult, optimal: number | null): OptimalityVerdict {
  if (result.status !== "found") return "no-path";
  if (optimal != null && result.pathCost! > optimal + EPS) return "suboptimal";
  if (result.guaranteesOptimal) return "guaranteed";
  return optimal != null ? "observed-optimal" : "unknown";
}

export type NumberStats = { mean: number; std: number; best: number; worst: number };

/** Média, desvio padrão amostral (n−1; 0 se n = 1), melhor (mín.) e pior (máx.). */
export function numberStats(values: number[]): NumberStats | null {
  if (values.length === 0) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.length > 1
      ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1)
      : 0;
  return { mean, std: Math.sqrt(variance), best: Math.min(...values), worst: Math.max(...values) };
}

export type RunAggregate = {
  runs: number;
  successes: number;
  /** 0..1 */
  successRate: number;
  time: NumberStats;
  /** Só execuções que acharam caminho; `null` se nenhuma achou. */
  cost: NumberStats | null;
  expansions: NumberStats;
};

export function aggregateRuns(runs: MazeRunSummary[]): RunAggregate {
  const ok = runs.filter((r) => r.found && r.pathCost != null);
  return {
    runs: runs.length,
    successes: ok.length,
    successRate: runs.length ? ok.length / runs.length : 0,
    time: numberStats(runs.map((r) => r.timeMs))!,
    cost: numberStats(ok.map((r) => r.pathCost!)),
    expansions: numberStats(runs.map((r) => r.nodeExpansions))!,
  };
}
