/**
 * Executa UM algoritmo em todos os cenários e imprime uma linha JSON por
 * resultado (prefixo "RESULT "). Chamado pelo orquestrador (run.mjs) em um
 * processo Node novo por algoritmo — o mesmo isolamento que a interface obtém
 * com um Web Worker novo por algoritmo.
 *
 * Usa exatamente as funções que os workers da ferramenta executam:
 * `runGraphJob` (grafos) e `solveMaze` (labirintos).
 *
 * Uso: vite-node scripts/experiments/runAlgorithm.ts -- graph <id> | maze <id>
 */
import { analyzeGraph } from "../../src/graph/analysis";
import { GRAPH_ALGORITHMS } from "../../src/graph/algorithms/registry";
import type { GraphAlgorithmId } from "../../src/graph/algorithms/types";
import { runGraphJob } from "../../src/graph/benchmark/runner";
import { MAZE_ALGORITHMS, solveMaze } from "../../src/maze/algorithms/registry";
import type { MazeAlgorithmId } from "../../src/maze/algorithms/types";
import { aggregateRuns } from "../../src/maze/algorithms/stats";
import { graphScenarios, mazeScenarios } from "./scenarios";

const [kind, id] = process.argv.slice(2).filter((a) => a !== "--");
const emit = (obj: unknown) => process.stdout.write(`RESULT ${JSON.stringify(obj)}\n`);

/** Resumo das distâncias para conferir consistência entre algoritmos sem gravar vetores inteiros. */
function distanceDigest(d: Float64Array | null) {
  if (!d) return null;
  let finite = 0;
  let sum = 0;
  let inf = 0;
  let negInf = 0;
  for (const x of d) {
    if (x === Infinity) inf++;
    else if (x === -Infinity) negInf++;
    else {
      finite++;
      sum += x;
    }
  }
  return { finite, sum, inf, negInf };
}

if (kind === "graph") {
  const algorithm = GRAPH_ALGORITHMS[id as GraphAlgorithmId];
  for (const sc of graphScenarios()) {
    const analysis = analyzeGraph(sc.g, sc.edgeCounts);
    const base = { experiment: sc.experiment, scenario: sc.id, description: sc.description, x: sc.x, n: sc.g.n, arcs: sc.g.targets.length, algorithmId: algorithm.id, problem: algorithm.problem };
    const check = algorithm.check(analysis, sc.query);
    if (!check.ok) {
      emit({ ...base, skipped: check.reason });
      continue;
    }
    const r = runGraphJob(sc.g, sc.query, { algorithmId: algorithm.id, samples: sc.samples });
    emit({
      ...base,
      status: r.status,
      timing: r.timing,
      expansions: r.counters.expansions,
      edgeScans: r.counters.edgeScans,
      relaxations: r.counters.relaxations,
      extra: r.counters.extra,
      info: r.info ?? null,
      targetDistance: r.target?.distance ?? null,
      pathEdges: r.target?.path ? r.target.path.length - 1 : null,
      reached: r.reached,
      digest: distanceDigest(r.sourceDistances),
    });
  }
} else if (kind === "maze") {
  const algorithm = MAZE_ALGORITHMS[id as MazeAlgorithmId];
  const seeds = Array.from({ length: 10 }, (_, i) => i + 1);
  for (const sc of mazeScenarios()) {
    // Estocásticos (lentos) só onde fazem sentido: M1 até 201, M2 e M4.
    if (algorithm.stochastic && (sc.experiment === "M3" || (sc.experiment === "M1" && sc.x > 201))) continue;
    const variants: Array<{ label: string; params: Record<string, number> }> = [{ label: "padrão", params: {} }];
    if (sc.id === "M4-maze101" && id === "aco") {
      variants.push({ label: "iterações = 100", params: { iterations: 100 } }, { label: "formigas = 60", params: { ants: 60 } });
    }
    if (sc.id === "M4-maze101" && id === "ga") {
      variants.push(
        { label: "gerações = 300, sem estagnação", params: { generations: 300, stagnationLimit: 0 } },
        { label: "população = 90", params: { populationSize: 90 } }
      );
    }
    for (const v of variants) {
      const outcome = solveMaze(sc.grid, algorithm.id, {
        params: { ...v.params, runs: algorithm.stochastic ? seeds.length : 1 },
        seeds: algorithm.stochastic ? seeds : [1],
      });
      const base = { experiment: sc.experiment, scenario: sc.id, description: sc.description, x: sc.x, size: sc.grid.size, algorithmId: algorithm.id, variant: v.label };
      if (!outcome.ok) {
        emit({ ...base, error: outcome.error });
        continue;
      }
      const r = outcome.result;
      emit({
        ...base,
        status: r.status,
        pathCost: r.pathCost,
        pathCells: r.pathCells,
        timeMs: r.timeMs,
        timedRuns: r.timedRuns,
        expansions: r.nodeExpansions,
        operations: r.operations,
        params: r.params,
        runs: r.runs,
        aggregate: algorithm.stochastic ? aggregateRuns(r.runs) : null,
      });
    }
  }
} else {
  throw new Error("uso: runAlgorithm.ts graph|maze <id>");
}
