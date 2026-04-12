import { dijkstra, dijkstraWithMetrics } from "../algorithms/Dijkstra";
import { bellmanFord, bellmanFordWithMetrics } from "../algorithms/Bellman-Ford";
import type { DijkstraMetrics } from "../algorithms/Dijkstra";
import type { BellmanFordMetrics } from "../algorithms/Bellman-Ford";
import type { Graph } from "../algorithms/types";
import { graphHasNegativeEdge } from "../graph/graphAnalysis";

export type AlgorithmId = "dijkstra" | "bellmanFord";

/** Mede até um bloco levar ~minChunkMs; média = tempo do bloco / n. */
function measureAverageMs(fn: () => void, minChunkMs = 2): { avgMs: number; batchRuns: number } {
  let n = 1;
  const maxN = 50_000_000;
  for (;;) {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) fn();
    const elapsed = performance.now() - t0;
    if (elapsed >= minChunkMs || n >= maxN) {
      return { avgMs: elapsed / n, batchRuns: n };
    }
    n = Math.min(n * 4, maxN);
  }
}

/** Chrome com `--js-flags="--expose-gc"` — ajuda a estabilizar medições. */
function triggerOptionalGc(): void {
  const g = (globalThis as unknown as { gc?: () => void }).gc;
  if (typeof g === "function") {
    try {
      g();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Heap JS clássico (Chrome). Costuma ser instável ou 0 fora de certos modos.
 */
function readChromeHeapSnapshot(): {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
} | null {
  const p = performance as Performance & {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  };
  const m = p.memory;
  if (!m || typeof m.usedJSHeapSize !== "number") return null;
  return {
    usedJSHeapSize: m.usedJSHeapSize,
    totalJSHeapSize: m.totalJSHeapSize,
    jsHeapSizeLimit: m.jsHeapSizeLimit,
  };
}

/** Forma unificada para deltas (UA ou heap). */
export type MemoryReading =
  | {
      mode: "measureUA";
      /** `performance.measureUserAgentSpecificMemory().bytes` */
      bytes: number;
    }
  | {
      mode: "heap";
      bytes: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };

type MemoryMeasurementResult = { bytes: number };

/**
 * Preferência: `measureUserAgentSpecificMemory` (Chrome moderno, https/localhost),
 * depois `performance.memory`. Entre medições chama `gc()` se existir e cede um
 * tick ao event loop para o GC assíncrono.
 */
async function takeMemoryReading(): Promise<MemoryReading | null> {
  triggerOptionalGc();
  await new Promise((r) => setTimeout(r, 0));

  const perf = performance as Performance & {
    measureUserAgentSpecificMemory?: () => Promise<MemoryMeasurementResult>;
  };

  if (typeof perf.measureUserAgentSpecificMemory === "function") {
    try {
      const result = await perf.measureUserAgentSpecificMemory();
      if (result && typeof result.bytes === "number" && Number.isFinite(result.bytes)) {
        return { mode: "measureUA", bytes: Math.max(0, result.bytes) };
      }
    } catch {
      /* API ausente, contexto inseguro ou política do navegador */
    }
  }

  const heap = readChromeHeapSnapshot();
  if (!heap) return null;
  return {
    mode: "heap",
    bytes: heap.usedJSHeapSize,
    totalJSHeapSize: heap.totalJSHeapSize,
    jsHeapSizeLimit: heap.jsHeapSizeLimit,
  };
}

export type BenchmarkAlgorithmResult = {
  algorithmId: AlgorithmId;
  label: string;
  skipped?: boolean;
  skipReason?: string;
  /** Tempo médio por execução (ms), via repetições até ~2ms de bloco. */
  avgTimeMs?: number;
  /** Mesmo valor em microssegundos (mais legível para tempos muito pequenos). */
  avgTimeUs?: number;
  batchRuns?: number;
  dist?: number[];
  hasNegativeCycle?: boolean;
  dijkstraMetrics?: DijkstraMetrics;
  bellmanMetrics?: BellmanFordMetrics;
  /**
   * Bytes após a medição (heap JS ou memória total UA, conforme `memoryMeasurementMode`).
   */
  heapUsedAfterBytes?: number | null;
  heapDeltaBytes?: number | null;
  totalJSHeapSize?: number | null;
  jsHeapSizeLimit?: number | null;
  /** Como `heapUsedAfterBytes` foi obtido. */
  memoryMeasurementMode?: "measureUA" | "heap" | null;
};

export type BenchmarkRunResult = {
  hasNegativeEdge: boolean;
  results: BenchmarkAlgorithmResult[];
  /** Bytes antes de qualquer algoritmo (mesma unidade que `heapUsedAfterBytes`). */
  heapBeforeRunBytes?: number | null;
  /** Modo da medição de memória nesta execução (se disponível). */
  memoryMeasurementMode?: "measureUA" | "heap" | null;
};

export async function runBenchmark(
  graph: Graph,
  source: number,
  selected: Record<AlgorithmId, boolean>
): Promise<BenchmarkRunResult> {
  const hasNegativeEdge = graphHasNegativeEdge(graph);
  const results: BenchmarkAlgorithmResult[] = [];

  const memBefore = await takeMemoryReading();
  const heapBeforeRunBytes = memBefore?.bytes ?? null;
  const runMemoryMode = memBefore?.mode ?? null;
  let memPrevBytes = heapBeforeRunBytes;

  const pushMemoryFields = (
    reading: MemoryReading | null
  ): Pick<
    BenchmarkAlgorithmResult,
    | "heapUsedAfterBytes"
    | "heapDeltaBytes"
    | "totalJSHeapSize"
    | "jsHeapSizeLimit"
    | "memoryMeasurementMode"
  > => {
    const usedAfter = reading?.bytes ?? null;
    const delta =
      memPrevBytes != null && usedAfter != null ? usedAfter - memPrevBytes : null;
    memPrevBytes = usedAfter;
    const mode = reading?.mode ?? null;
    return {
      heapUsedAfterBytes: usedAfter,
      heapDeltaBytes: delta,
      totalJSHeapSize: reading?.mode === "heap" ? reading.totalJSHeapSize : null,
      jsHeapSizeLimit: reading?.mode === "heap" ? reading.jsHeapSizeLimit : null,
      memoryMeasurementMode: mode,
    };
  };

  if (selected.dijkstra) {
    if (hasNegativeEdge) {
      results.push({
        algorithmId: "dijkstra",
        label: "Dijkstra",
        skipped: true,
        skipReason:
          "Existe aresta com peso negativo. Dijkstra exige pesos ≥ 0; o resultado não seria garantido.",
      });
    } else {
      const { avgMs, batchRuns } = measureAverageMs(() => dijkstra(graph, source));
      const { dist, metrics } = dijkstraWithMetrics(graph, source);
      const memReading = await takeMemoryReading();
      results.push({
        algorithmId: "dijkstra",
        label: "Dijkstra",
        avgTimeMs: avgMs,
        avgTimeUs: avgMs * 1000,
        batchRuns,
        dist,
        dijkstraMetrics: metrics,
        ...pushMemoryFields(memReading),
      });
    }
  }

  if (selected.bellmanFord) {
    const { avgMs, batchRuns } = measureAverageMs(() => bellmanFord(graph, source));
    const { dist, hasNegativeCycle, metrics } = bellmanFordWithMetrics(graph, source);
    const memReading = await takeMemoryReading();
    results.push({
      algorithmId: "bellmanFord",
      label: "Bellman-Ford",
      avgTimeMs: avgMs,
      avgTimeUs: avgMs * 1000,
      batchRuns,
      dist,
      hasNegativeCycle,
      bellmanMetrics: metrics,
      ...pushMemoryFields(memReading),
    });
  }

  return {
    hasNegativeEdge,
    results,
    heapBeforeRunBytes,
    memoryMeasurementMode: runMemoryMode,
  };
}
