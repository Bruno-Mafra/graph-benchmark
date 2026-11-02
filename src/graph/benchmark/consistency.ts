import type { GraphAlgorithmId } from "../algorithms/types";
import type { GraphRunResult } from "./runner";

/** Ordem de preferência para a referência de distâncias (algoritmos exatos de origem única/todos os pares). */
const REFERENCE_ORDER: GraphAlgorithmId[] = ["dijkstra", "bellmanFord", "dagShortestPath", "bfs", "johnson", "floydWarshall"];

/** Resultado de referência: o primeiro exato, na ordem acima, que trouxe distâncias. */
export function referenceResult(results: GraphRunResult[]): GraphRunResult | null {
  for (const id of REFERENCE_ORDER) {
    const r = results.find((x) => x.algorithmId === id && x.sourceDistances);
    if (r) return r;
  }
  return null;
}

function same(a: number, b: number): boolean {
  if (a === b) return true; // inclui ±Infinity
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

export type Consistency =
  | { status: "reference" }
  | { status: "match" }
  | { status: "mismatch"; count: number }
  | { status: "unavailable" };

/**
 * Confere um resultado contra a referência: todas as distâncias da origem
 * (origem única / todos os pares) ou só a do destino (origem → destino).
 * Johnson com ciclo negativo não tem distâncias para comparar.
 */
export function checkConsistency(result: GraphRunResult, ref: GraphRunResult | null): Consistency {
  if (!ref) return { status: "unavailable" };
  if (result === ref) return { status: "reference" };
  const refDist = ref.sourceDistances!;
  if (result.sourceDistances) {
    let count = 0;
    for (let v = 0; v < refDist.length; v++) if (!same(result.sourceDistances[v], refDist[v])) count++;
    return count ? { status: "mismatch", count } : { status: "match" };
  }
  if (result.target && ref.target) {
    return same(result.target.distance, ref.target.distance) ? { status: "match" } : { status: "mismatch", count: 1 };
  }
  return { status: "unavailable" };
}
