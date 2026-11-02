import { measureSamples } from "../../benchmark/measure";
import type { TimingStats } from "../../benchmark/measure";
import { analyzeGraph } from "../analysis";
import { GRAPH_ALGORITHMS } from "../algorithms/registry";
import { pathFromPrev } from "../algorithms/singleSource";
import type { AlgorithmOutput, Counters, GraphAlgorithmId, GraphQuery, ProblemKind } from "../algorithms/types";
import { buildInstance } from "../types";
import type { GraphInstance } from "../types";
import { generateGeometric, generatedToGraph } from "../generators";
import { createRng } from "../../utils/random";

export type RunStatus = "ok" | "negative-cycle";

/** Resultado padronizado de um algoritmo sobre o grafo e a consulta atuais. */
export type GraphRunResult = {
  algorithmId: GraphAlgorithmId;
  label: string;
  problem: ProblemKind;
  /** "negative-cycle" = execução válida que encontrou ciclo negativo (distâncias indefinidas). */
  status: RunStatus;
  /** Distâncias a partir da origem (−∞ = afetada por ciclo negativo). null para origem→destino. */
  sourceDistances: Float64Array | null;
  /** Predecessores a partir da origem, para reconstruir caminhos. */
  sourcePrev: Int32Array | null;
  /** Consulta ao destino (se houver): Infinity = sem caminho; −∞ = indefinida. */
  target: { distance: number; path: number[] | null } | null;
  /** Vértices alcançados a partir da origem (null quando não calculado). */
  reached: number | null;
  counters: Counters;
  info?: Record<string, number>;
  timing: TimingStats;
};

export type GraphJob = { algorithmId: GraphAlgorithmId; samples: number };

/**
 * Executa e mede um algoritmo. O tempo cobre só `run` (aquecimento + amostras
 * de blocos ≥ 2 ms, ver measureSamples); a extração da linha da origem e dos
 * caminhos acontece depois, fora da medição. A instância não é modificada.
 */
export function runGraphJob(g: GraphInstance, query: GraphQuery, job: GraphJob): GraphRunResult {
  const algorithm = GRAPH_ALGORITHMS[job.algorithmId];
  const { timing, output } = measureSamples(() => algorithm.run(g, query), job.samples);
  return {
    algorithmId: algorithm.id,
    label: algorithm.label,
    problem: algorithm.problem,
    timing,
    ...extract(g, query, output),
  };
}

function extract(
  g: GraphInstance,
  query: GraphQuery,
  out: AlgorithmOutput
): Omit<GraphRunResult, "algorithmId" | "label" | "problem" | "timing"> {
  const { source, target } = query;
  if (out.kind === "p2p") {
    return {
      status: "ok",
      sourceDistances: null,
      sourcePrev: null,
      target: { distance: out.distance, path: out.path },
      reached: null,
      counters: out.counters,
      info: out.info,
    };
  }

  let dist: Float64Array;
  let prev: Int32Array;
  if (out.kind === "sssp") {
    dist = out.dist;
    prev = out.prev;
  } else {
    if (out.dist.length === 0) {
      // Johnson aborta com ciclo negativo: nenhuma distância é válida.
      return {
        status: "negative-cycle",
        sourceDistances: null,
        sourcePrev: null,
        target: target == null ? null : { distance: -Infinity, path: null },
        reached: null,
        counters: out.counters,
      };
    }
    const n = g.n;
    dist = out.dist.slice(source * n, source * n + n);
    prev = out.pred.slice(source * n, source * n + n);
    if (out.negativeCycle) {
      // Floyd-Warshall: s → k → j com d[k][k] < 0 torna d[s][j] indefinida.
      for (let k = 0; k < n; k++) {
        if (!(out.dist[k * n + k] < 0) || out.dist[source * n + k] === Infinity) continue;
        for (let j = 0; j < n; j++) if (out.dist[k * n + j] < Infinity) dist[j] = -Infinity;
      }
    }
  }

  let reached = 0;
  for (let v = 0; v < dist.length; v++) if (dist[v] !== Infinity) reached++;
  return {
    status: out.negativeCycle ? "negative-cycle" : "ok",
    sourceDistances: dist,
    sourcePrev: prev,
    target: target == null ? null : { distance: dist[target], path: pathFromPrev(prev, dist, source, target) },
    reached,
    counters: out.counters,
  };
}

// ---------------------------------------------------------------- crescimento

export const GROWTH_SIZES = [100, 500, 1000, 2000, 5000, 10000] as const;

export type GrowthJob = { algorithmId: GraphAlgorithmId; sizes: number[]; seed: number; samples: number };

export type GrowthPoint = {
  algorithmId: GraphAlgorithmId;
  n: number;
  arcs: number;
  /** Mediana do tempo por execução; null se não executado. */
  medianMs: number | null;
  skippedReason?: string;
};

/**
 * Grafo da curva de crescimento: geométrico não direcionado (k = 3 vizinhos),
 * com semente fixa por tamanho — todos os algoritmos medem exatamente o mesmo
 * grafo. Origem 0; destino = vértice mais distante em saltos (fora da medição).
 */
export function growthInstance(n: number, seed: number): { g: GraphInstance; query: GraphQuery } {
  const gen = generateGeometric(n, { rng: createRng(seed * 1_000_003 + n) });
  const g = buildInstance(generatedToGraph(gen), gen.positions);
  const hops = new Int32Array(n).fill(-1);
  const queue = [0];
  hops[0] = 0;
  let far = 0;
  for (let h = 0; h < queue.length; h++) {
    const u = queue[h];
    if (hops[u] > hops[far]) far = u;
    for (let k = g.offsets[u]; k < g.offsets[u + 1]; k++) {
      const v = g.targets[k];
      if (hops[v] === -1) {
        hops[v] = hops[u] + 1;
        queue.push(v);
      }
    }
  }
  return { g, query: { source: 0, target: far } };
}

export function runGrowthJob(job: GrowthJob, emit: (p: GrowthPoint) => void): void {
  const algorithm = GRAPH_ALGORITHMS[job.algorithmId];
  for (const n of job.sizes) {
    const { g, query } = growthInstance(n, job.seed);
    const check = algorithm.check(analyzeGraph(g, { directed: 0, undirected: g.targets.length / 2 }), query);
    if (!check.ok) {
      emit({ algorithmId: algorithm.id, n, arcs: g.targets.length, medianMs: null, skippedReason: check.reason });
      continue;
    }
    const { timing } = measureSamples(() => algorithm.run(g, query), job.samples);
    emit({ algorithmId: algorithm.id, n, arcs: g.targets.length, medianMs: timing.medianMs });
  }
}
