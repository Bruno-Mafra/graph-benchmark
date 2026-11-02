import { measureAverageMs, warmUp } from "../../benchmark/measure";
import { createRng } from "../generator";
import { validateEndpoints } from "../model";
import type { MazeGrid } from "../model";
import { dijkstraGrid } from "./dijkstraGrid";
import { bfsGrid, bidirectionalBfsGrid } from "./bfs";
import { astarGrid, greedyGrid } from "./bestFirst";
import { acoGrid } from "./aco";
import { gaGrid } from "./ga";
import { ACO_PARAMS, GA_PARAMS, validateParams } from "./params";
import type {
  AlgorithmParams,
  MazeAlgorithm,
  MazeAlgorithmId,
  MazeRunSummary,
  MazeSearchOutput,
  MazeSolveResult,
} from "./types";

const HEAP_EXPANSION =
  "Expansão = célula retirada da fila de prioridade e processada (no máximo uma vez por célula).";

/** Algoritmos disponíveis na aba de labirintos, na ordem de exibição. */
export const MAZE_ALGORITHMS: Record<MazeAlgorithmId, MazeAlgorithm> = {
  dijkstra: {
    id: "dijkstra",
    label: "Dijkstra",
    shortLabel: "Dijkstra",
    kind: "exact",
    description: "Expande sempre a célula de menor custo acumulado. Referência de custo ótimo.",
    guaranteesOptimal: true,
    stochastic: false,
    expansionDefinition: HEAP_EXPANSION,
    params: [],
    search: dijkstraGrid,
  },
  bfs: {
    id: "bfs",
    label: "BFS",
    shortLabel: "BFS",
    kind: "exact",
    description: "Busca em largura com fila: explora em camadas de mesmo número de movimentos.",
    guaranteesOptimal: true,
    optimalityNote: "em grids sem pesos",
    stochastic: false,
    expansionDefinition: "Expansão = célula retirada da fila FIFO e processada.",
    params: [],
    search: bfsGrid,
  },
  bidirectionalBfs: {
    id: "bidirectionalBfs",
    label: "BFS bidirecional",
    shortLabel: "BFS bi",
    kind: "exact",
    description: "Duas buscas em largura, do início e do destino, que se encontram no meio.",
    guaranteesOptimal: true,
    optimalityNote: "em grids sem pesos",
    stochastic: false,
    expansionDefinition: "Expansão = célula retirada de qualquer uma das duas filas (soma das duas frentes).",
    params: [],
    search: bidirectionalBfsGrid,
  },
  astar: {
    id: "astar",
    label: "A*",
    shortLabel: "A*",
    kind: "heuristic",
    description: "Custo acumulado + distância Manhattan até o destino (heurística admissível).",
    guaranteesOptimal: true,
    stochastic: false,
    expansionDefinition: HEAP_EXPANSION,
    params: [],
    search: astarGrid,
  },
  greedy: {
    id: "greedy",
    label: "Greedy Best-First",
    shortLabel: "Greedy",
    kind: "heuristic",
    description: "Segue a célula que parece mais próxima do destino (só Manhattan). Rápido, sem garantia.",
    guaranteesOptimal: false,
    stochastic: false,
    expansionDefinition: HEAP_EXPANSION,
    params: [],
    search: greedyGrid,
  },
  aco: {
    id: "aco",
    label: "Colônia de Formigas (ACO)",
    shortLabel: "ACO",
    kind: "metaheuristic",
    description: "Formigas constroem rotas guiadas por feromônio e proximidade do destino.",
    guaranteesOptimal: false,
    stochastic: true,
    expansionDefinition:
      "Expansão = célula em que uma formiga entrou, somando todas as formigas e iterações.",
    params: ACO_PARAMS,
    search: acoGrid,
  },
  ga: {
    id: "ga",
    label: "Algoritmo Genético (GA)",
    shortLabel: "GA",
    kind: "metaheuristic",
    description: "População de rotas válidas evolui por seleção, crossover e mutação.",
    guaranteesOptimal: false,
    stochastic: true,
    expansionDefinition:
      "Expansão = célula visitada pelas buscas aleatórias que constroem rotas (população inicial, mutações e imigrantes).",
    params: GA_PARAMS,
    search: gaGrid,
  },
};

export const MAZE_ALGORITHM_IDS = Object.keys(MAZE_ALGORITHMS) as MazeAlgorithmId[];

/** Rótulos e definições das chaves de `operations`. */
export const OPERATION_LABELS: Record<string, { label: string; unit: string; title: string }> = {
  relaxations: {
    label: "Relaxações",
    unit: "distâncias melhoradas",
    title: "Vezes em que a distância provisória de um vizinho diminuiu.",
  },
  heapPushes: {
    label: "Inserções na heap",
    unit: "pushes",
    title: "Itens inseridos na fila de prioridade.",
  },
  heapPops: {
    label: "Remoções da heap",
    unit: "pops",
    title: "Itens retirados da fila, incluindo entradas obsoletas descartadas.",
  },
  enqueues: {
    label: "Inserções na fila",
    unit: "enqueues",
    title: "Células inseridas na(s) fila(s) FIFO.",
  },
  iterationsRun: {
    label: "Iterações",
    unit: "executadas",
    title: "Iterações da colônia efetivamente executadas.",
  },
  antsLaunched: {
    label: "Formigas",
    unit: "lançadas",
    title: "Total de formigas que iniciaram uma rota.",
  },
  antsArrived: {
    label: "Formigas no destino",
    unit: "rotas completas",
    title: "Formigas que chegaram ao destino.",
  },
  backtracks: {
    label: "Retrocessos",
    unit: "passos desfeitos",
    title: "Vezes em que uma formiga ficou sem saída e voltou uma célula.",
  },
  pheromoneDeposits: {
    label: "Depósitos de feromônio",
    unit: "arestas reforçadas",
    title: "Arestas que receberam feromônio (somando formigas e reforço elitista).",
  },
  generationsRun: {
    label: "Gerações",
    unit: "executadas",
    title: "Gerações efetivamente executadas até o critério de parada.",
  },
  fitnessEvaluations: {
    label: "Avaliações de aptidão",
    unit: "rotas avaliadas",
    title: "Rotas novas cujo custo foi calculado.",
  },
  crossovers: {
    label: "Crossovers",
    unit: "aplicados",
    title: "Combinações de dois pais.",
  },
  mutations: {
    label: "Mutações",
    unit: "aplicadas",
    title: "Trechos de rota substituídos por desvios aleatórios.",
  },
  immigrants: {
    label: "Imigrantes",
    unit: "rotas novas",
    title: "Indivíduos repetidos substituídos por rotas aleatórias novas (diversidade).",
  },
};

export type SolveOptions = {
  /** Parâmetros do algoritmo; ausentes usam o padrão. */
  params?: Record<string, number>;
  /** Uma semente por execução independente. Padrão: [1]. */
  seeds?: number[];
  /** Chamado após cada execução (progresso). */
  onRun?: (done: number, total: number) => void;
  /** Execuções de aquecimento não medidas antes de medir (padrão: true). */
  warmUp?: boolean;
};

export type SolveMazeOutcome =
  | { ok: true; result: MazeSolveResult }
  | { ok: false; error: string };

/**
 * Executa um algoritmo e padroniza o resultado. Mesma metodologia de tempo
 * para todos: aquecimento não medido e, depois, cada execução é medida com
 * performance.now(), repetindo a MESMA execução (mesma semente) até o bloco
 * levar ~2 ms, como no benchmark de grafos. Assim execuções curtas ganham
 * precisão sem misturar execuções diferentes.
 *
 * Estocásticos rodam uma vez por semente; o resultado traz a melhor execução
 * e o resumo de todas em `runs`. O grid recebido nunca é modificado.
 */
export function solveMaze(
  grid: MazeGrid,
  algorithmId: MazeAlgorithmId,
  options: SolveOptions = {}
): SolveMazeOutcome {
  const error = validateEndpoints(grid);
  if (error) return { ok: false, error };

  const algorithm = MAZE_ALGORITHMS[algorithmId];
  const { params, errors } = validateParams(algorithm.params, options.params ?? {});
  const firstError = Object.entries(errors)[0];
  if (firstError) return { ok: false, error: `Parâmetro inválido (${firstError[0]}): ${firstError[1]}` };

  const seeds = algorithm.stochastic ? (options.seeds?.length ? options.seeds : [1]) : [options.seeds?.[0] ?? 1];
  if (options.warmUp !== false) {
    warmUp(() => algorithm.search(grid, { rng: createRng(seeds[0]), params }));
  }
  const runs: MazeRunSummary[] = [];
  let best: { output: MazeSearchOutput; timeMs: number; timedRuns: number } | null = null;

  seeds.forEach((seed, idx) => {
    let output: MazeSearchOutput | null = null;
    const { avgMs, batchRuns } = measureAverageMs(() => {
      output = algorithm.search(grid, { rng: createRng(seed), params });
    });
    const out = output as unknown as MazeSearchOutput;
    runs.push({
      seed,
      found: out.found,
      pathCost: out.pathCost,
      pathCells: out.path.length,
      timeMs: avgMs,
      nodeExpansions: out.nodeExpansions,
    });
    if (!best || isBetterRun(out, avgMs, best.output, best.timeMs)) {
      best = { output: out, timeMs: avgMs, timedRuns: batchRuns };
    }
    options.onRun?.(idx + 1, seeds.length);
  });

  const chosen = best as unknown as { output: MazeSearchOutput; timedRuns: number };
  const meanTime = runs.reduce((s, r) => s + r.timeMs, 0) / runs.length;
  return {
    ok: true,
    result: {
      ...chosen.output,
      algorithmId,
      label: algorithm.label,
      guaranteesOptimal: effectiveGuarantee(algorithm, grid),
      stochastic: algorithm.stochastic,
      status: chosen.output.found ? "found" : "no-path",
      pathCells: chosen.output.path.length,
      timeMs: meanTime,
      timedRuns: chosen.timedRuns,
      params: params as AlgorithmParams,
      runs,
    },
  };
}

/** Garantias "em grids sem pesos" deixam de valer quando há custos por célula. */
export function effectiveGuarantee(algorithm: MazeAlgorithm, grid: MazeGrid): boolean {
  if (!algorithm.guaranteesOptimal) return false;
  return !(algorithm.optimalityNote && grid.costs);
}

function isBetterRun(a: MazeSearchOutput, aTime: number, b: MazeSearchOutput, bTime: number): boolean {
  if (a.found !== b.found) return a.found;
  if (a.found && a.pathCost !== b.pathCost) return a.pathCost! < b.pathCost!;
  return aTime < bTime;
}
