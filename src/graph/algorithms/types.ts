import type { GraphAnalysis } from "../analysis";
import type { GraphInstance } from "../types";

export type GraphAlgorithmId =
  | "dijkstra"
  | "bellmanFord"
  | "bfs"
  | "dagShortestPath"
  | "dijkstraTarget"
  | "astar"
  | "bidirectionalDijkstra"
  | "floydWarshall"
  | "johnson"
  | "duanSssp";

/**
 * Problema resolvido. Só faz sentido comparar tempos dentro do mesmo problema:
 * - sssp: distâncias da origem para todos os vértices;
 * - p2p: distância e caminho da origem até um destino;
 * - apsp: distâncias entre todos os pares.
 */
export type ProblemKind = "sssp" | "p2p" | "apsp";

export type GraphQuery = { source: number; target: number | null };

/**
 * Contagens padronizadas (mesmo significado em todos os algoritmos):
 * - expansions: vértices processados (definição exata em `expansionDefinition`);
 * - edgeScans: arcos examinados;
 * - relaxations: vezes em que uma distância provisória diminuiu.
 * `extra` traz contagens específicas (ver OPERATION_LABELS).
 */
export type Counters = {
  expansions: number;
  edgeScans: number;
  relaxations: number;
  extra: Record<string, number>;
};

export type AlgorithmOutput =
  | {
      kind: "sssp";
      /** Ciclo negativo alcançável pela origem: distâncias −∞ em `dist`. */
      negativeCycle: boolean;
      dist: Float64Array;
      prev: Int32Array;
      counters: Counters;
    }
  | {
      kind: "p2p";
      /** Infinity = destino inalcançável. */
      distance: number;
      path: number[] | null;
      counters: Counters;
      /** Valores informativos (ex.: fator da heurística). */
      info?: Record<string, number>;
    }
  | {
      kind: "apsp";
      negativeCycle: boolean;
      /** Matriz n×n linearizada (linha = origem); vazia se ciclo negativo impediu o cálculo. */
      dist: Float64Array;
      /** pred[i·n + j] = predecessor de j no caminho mínimo i → j (−1 se nenhum). */
      pred: Int32Array;
      counters: Counters;
    };

export type Compatibility = { ok: true; note?: string } | { ok: false; reason: string };

export type GraphAlgorithm = {
  id: GraphAlgorithmId;
  label: string;
  shortLabel: string;
  problem: ProblemKind;
  description: string;
  complexity: string;
  /** Restrições, em uma frase, exibidas mesmo quando o algoritmo é compatível. */
  requirements: string;
  /** Implementação experimental: exibida com aviso e não selecionada por padrão. */
  experimental?: string;
  expansionDefinition: string;
  /** Verifica se pode rodar neste grafo/consulta; nunca altera o grafo. */
  check: (analysis: GraphAnalysis, query: { source: number | null; target: number | null }) => Compatibility;
  run: (g: GraphInstance, query: GraphQuery) => AlgorithmOutput;
};

export function newCounters(): Counters {
  return { expansions: 0, edgeScans: 0, relaxations: 0, extra: {} };
}
