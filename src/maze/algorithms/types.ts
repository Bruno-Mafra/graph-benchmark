import type { MazeGrid } from "../model";

/** Novos algoritmos entram nesta união e em `MAZE_ALGORITHMS` (registry.ts). */
export type MazeAlgorithmId =
  | "dijkstra"
  | "bfs"
  | "bidirectionalBfs"
  | "astar"
  | "greedy"
  | "aco"
  | "ga";

export type MazeAlgorithmKind = "exact" | "heuristic" | "metaheuristic";

/** Parâmetros numéricos de um algoritmo (validados por `validateParams`). */
export type AlgorithmParams = Record<string, number>;

export type MazeSearchContext = {
  /** Fonte de aleatoriedade (algoritmos estocásticos). Determinísticos ignoram. */
  rng: () => number;
  params: AlgorithmParams;
};

/** Saída crua de um algoritmo de busca, sem medição de tempo. */
export type MazeSearchOutput = {
  found: boolean;
  /** Índices das células do caminho, de início a destino (inclusive). Vazio se não há caminho. */
  path: number[];
  /** Soma dos custos das arestas do caminho; `null` se não há caminho. */
  pathCost: number | null;
  /** 1 = célula expandida/visitada pela busca (ver `expansionDefinition`). */
  explored: Uint8Array;
  /** Vértices expandidos: métrica principal de "operações" (definição por algoritmo). */
  nodeExpansions: number;
  /** Outras contagens instrumentadas pelo próprio algoritmo (chave em OPERATION_LABELS). */
  operations: Record<string, number>;
};

export type ParamSpec = {
  key: string;
  label: string;
  help: string;
  min: number;
  max: number;
  step: number;
  integer: boolean;
  default: number;
};

export type MazeAlgorithm = {
  id: MazeAlgorithmId;
  label: string;
  /** Rótulo curto para eixos de gráficos. */
  shortLabel: string;
  kind: MazeAlgorithmKind;
  /** Uma frase sobre a estratégia. */
  description: string;
  /** Garantia TEÓRICA de caminho de menor custo (o observado é calculado à parte). */
  guaranteesOptimal: boolean;
  /** Condição da garantia, quando houver (ex.: "em grids sem pesos"). */
  optimalityNote?: string;
  /** Resultados variam entre execuções (usa `ctx.rng`). */
  stochastic: boolean;
  /** O que `nodeExpansions` conta neste algoritmo. */
  expansionDefinition: string;
  /** Parâmetros configuráveis (vazio para os determinísticos). */
  params: ParamSpec[];
  /** Pré-condição: `validateEndpoints(grid) === null`. Não deve modificar `grid`. */
  search: (grid: MazeGrid, ctx: MazeSearchContext) => MazeSearchOutput;
};

export type MazeSolveStatus = "found" | "no-path";

/** Resumo de uma execução individual (usado nas repetições de estocásticos). */
export type MazeRunSummary = {
  seed: number;
  found: boolean;
  pathCost: number | null;
  pathCells: number;
  timeMs: number;
  nodeExpansions: number;
};

/** Resultado padronizado de um algoritmo (comparável entre algoritmos). */
export type MazeSolveResult = MazeSearchOutput & {
  algorithmId: MazeAlgorithmId;
  label: string;
  guaranteesOptimal: boolean;
  stochastic: boolean;
  status: MazeSolveStatus;
  /** Células no caminho, contando início e destino (0 se não há caminho). */
  pathCells: number;
  /**
   * Tempo médio de UMA execução da busca, sem renderização. Para estocásticos,
   * média entre as execuções repetidas (cada uma medida da mesma forma).
   */
  timeMs: number;
  /** Repetições idênticas usadas para medir uma execução (ver solveMaze). */
  timedRuns: number;
  /** Parâmetros usados (cópia validada). */
  params: AlgorithmParams;
  /**
   * Execuções independentes (≥ 1). Para estocásticos, os campos de caminho do
   * resultado vêm da MELHOR execução (menor custo; empate → menor tempo).
   */
  runs: MazeRunSummary[];
};
