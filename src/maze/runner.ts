import type { MazeGrid } from "./model";
import { MAZE_ALGORITHMS, solveMaze } from "./algorithms/registry";
import type { MazeAlgorithmId, MazeSolveResult } from "./algorithms/types";

/** Pedido de execução de um algoritmo (mesmo formato no worker e no fallback). */
export type MazeJob = {
  algorithmId: MazeAlgorithmId;
  params: Record<string, number>;
  /** Uma semente por execução; determinísticos usam só a primeira. */
  seeds: number[];
};

export type RunnerEvent =
  | { type: "progress"; algorithmId: MazeAlgorithmId; run: number; runs: number }
  | { type: "result"; result: MazeSolveResult }
  | { type: "error"; algorithmId: MazeAlgorithmId; message: string };

/** Sementes aleatórias para `runs` execuções (registradas no resultado). */
export function makeSeeds(runs: number, random: () => number = Math.random): number[] {
  return Array.from({ length: Math.max(1, runs) }, () => Math.floor(random() * 2 ** 31) + 1);
}

/** Monta os jobs: estocásticos recebem `params.runs` sementes, determinísticos uma. */
export function buildJobs(
  ids: MazeAlgorithmId[],
  paramsById: Partial<Record<MazeAlgorithmId, Record<string, number>>>,
  random?: () => number
): MazeJob[] {
  return ids.map((id) => {
    const params = paramsById[id] ?? {};
    const runs = MAZE_ALGORITHMS[id].stochastic ? params.runs ?? 1 : 1;
    return { algorithmId: id, params, seeds: makeSeeds(runs, random) };
  });
}

/**
 * Executa os jobs em sequência sobre a MESMA instância do grid (nenhum
 * algoritmo a modifica). Usado pelo Web Worker e pelo fallback síncrono.
 */
export function runJobsSync(
  grid: MazeGrid,
  jobs: MazeJob[],
  emit: (event: RunnerEvent) => void
): void {
  for (const job of jobs) {
    const runs = MAZE_ALGORITHMS[job.algorithmId].stochastic ? job.seeds.length : 1;
    emit({ type: "progress", algorithmId: job.algorithmId, run: 0, runs });
    try {
      const outcome = solveMaze(grid, job.algorithmId, {
        params: job.params,
        seeds: job.seeds,
        onRun: (run, runs) => emit({ type: "progress", algorithmId: job.algorithmId, run, runs }),
      });
      if (outcome.ok) emit({ type: "result", result: outcome.result });
      else emit({ type: "error", algorithmId: job.algorithmId, message: outcome.error });
    } catch (e) {
      emit({
        type: "error",
        algorithmId: job.algorithmId,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }
}
