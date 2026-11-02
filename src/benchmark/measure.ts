/**
 * Medição de tempo compartilhada pelos benchmarks (grafos e labirintos).
 * Mede só a função passada, com performance.now(); nada de interface entra aqui.
 */

/** Mede até um bloco levar ~minChunkMs; média = tempo do bloco / n. */
export function measureAverageMs(fn: () => void, minChunkMs = 2): { avgMs: number; batchRuns: number } {
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

const WARM_UP_BUDGET_MS = 150;
const WARM_UP_MAX_RUNS = 200;

/**
 * Executa sem medir até ~150 ms (máx. 200 vezes; ao menos 1) para que o JIT do
 * motor JavaScript compile o código antes da medição. Sem isso, o primeiro
 * algoritmo medido sai artificialmente lento e a ordem de execução distorce a
 * comparação.
 */
export function warmUp(fn: () => void): void {
  const t0 = performance.now();
  for (let i = 0; i < WARM_UP_MAX_RUNS; i++) {
    fn();
    if (performance.now() - t0 >= WARM_UP_BUDGET_MS) break;
  }
}

export type TimingStats = {
  /** Mediana das amostras: estimativa principal (robusta a pausas do GC). */
  medianMs: number;
  meanMs: number;
  /** Desvio padrão amostral (n−1; 0 com uma amostra). */
  stdMs: number;
  minMs: number;
  maxMs: number;
  samples: number;
  /** Execuções por amostra no último bloco medido. */
  batchRuns: number;
};

export function timingStats(samplesMs: number[], batchRuns: number): TimingStats {
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const variance = n > 1 ? sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : 0;
  return {
    medianMs: median,
    meanMs: mean,
    stdMs: Math.sqrt(variance),
    minMs: sorted[0],
    maxMs: sorted[n - 1],
    samples: n,
    batchRuns,
  };
}

/**
 * Aquece e coleta `samples` amostras de tempo por execução (cada amostra é um
 * bloco de ≥ 2 ms). `fn` deve ser determinística: todas as repetições fazem o
 * mesmo trabalho. Devolve as estatísticas e o retorno da última execução.
 */
export function measureSamples<T>(fn: () => T, samples: number): { timing: TimingStats; output: T } {
  let output!: T;
  const run = () => {
    output = fn();
  };
  warmUp(run);
  const values: number[] = [];
  let batchRuns = 1;
  for (let s = 0; s < Math.max(1, samples); s++) {
    const m = measureAverageMs(run);
    values.push(m.avgMs);
    batchRuns = m.batchRuns;
  }
  return { timing: timingStats(values, batchRuns), output };
}
