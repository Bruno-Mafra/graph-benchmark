import { createRng } from "../utils/random";
import type { Graph } from "./types";

export type GenEdge = { u: number; v: number; w: number; bidirectional: boolean };

export type GeneratedGraph = {
  n: number;
  edges: GenEdge[];
  /** Posições já definidas pelo gerador (grade, linha, geométrico). */
  positions?: Float64Array;
};

export type WeightMode = "random" | "unit";

export type GeneratorOptions = {
  rng?: () => number;
  /** "unit" = todos os pesos 1 (compatível com BFS). */
  weights?: WeightMode;
};

export const GRID_SPACING = 120;

function randInt(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function weightFn(opts: GeneratorOptions, rng: () => number): () => number {
  return opts.weights === "unit" ? () => 1 : () => randInt(rng, 1, 10);
}

/** Lista de adjacência equivalente (aresta não direcionada = dois arcos). */
export function generatedToGraph(gen: GeneratedGraph): Graph {
  const g: Graph = Array.from({ length: gen.n }, () => []);
  for (const e of gen.edges) {
    g[e.u].push({ to: e.v, weight: e.w });
    if (e.bidirectional) g[e.v].push({ to: e.u, weight: e.w });
  }
  return g;
}

/**
 * Arborescência aleatória enraizada em 0 (todo vértice alcançável a partir
 * de 0) + arcos extras sem repetição até a média de `outDegree` arcos por vértice.
 * `forward` restringe arcos a u < v (resulta em DAG).
 */
function randomDirected(
  n: number,
  outDegree: number,
  rng: () => number,
  weight: () => number,
  forward = false
): GenEdge[] {
  const edges: GenEdge[] = [];
  const seen = new Set<number>();
  const add = (u: number, v: number) => {
    const key = u * n + v;
    if (u === v || seen.has(key)) return false;
    seen.add(key);
    edges.push({ u, v, w: weight(), bidirectional: false });
    return true;
  };
  for (let v = 1; v < n; v++) add(Math.floor(rng() * v), v);
  const target = Math.round(n * outDegree);
  let attempts = 0;
  while (edges.length < target && attempts < target * 20) {
    attempts++;
    let u = Math.floor(rng() * n);
    let v = Math.floor(rng() * n);
    if (forward && u > v) [u, v] = [v, u];
    add(u, v);
  }
  return shuffleLabels(edges, n, rng);
}

/**
 * Embaralha os rótulos dos vértices 1..n−1 (o 0 continua sendo a raiz).
 * Sem isso, todo arco da arborescência iria de índice menor para maior e a
 * ordem dos índices coincidiria com uma ordem topológica — o Bellman-Ford, que
 * percorre os vértices nessa ordem, convergiria numa só rodada e pareceria
 * artificialmente rápido (viés observado nos experimentos, ver
 * docs/experimentos/AVALIACAO_EXPERIMENTAL.md).
 */
function shuffleLabels(edges: GenEdge[], n: number, rng: () => number): GenEdge[] {
  const label = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 1; i--) {
    const j = 1 + Math.floor(rng() * i);
    [label[i], label[j]] = [label[j], label[i]];
  }
  for (const e of edges) {
    e.u = label[e.u];
    e.v = label[e.v];
  }
  return edges;
}

/** Esparso dirigido: E ≈ 2V, todos alcançáveis a partir do vértice 0. */
export function generateSparse(n: number, opts: GeneratorOptions = {}): GeneratedGraph {
  const rng = opts.rng ?? Math.random;
  return { n, edges: randomDirected(n, 2, rng, weightFn(opts, rng)) };
}

/** Denso dirigido: cada par ordenado com probabilidade 0,6 (E ≈ 0,6·V²). */
export function generateDense(n: number, opts: GeneratorOptions = {}): GeneratedGraph {
  const rng = opts.rng ?? Math.random;
  const weight = weightFn(opts, rng);
  const edges: GenEdge[] = [];
  for (let u = 0; u < n; u++) {
    for (let v = 0; v < n; v++) {
      if (u !== v && rng() < 0.6) edges.push({ u, v, w: weight(), bidirectional: false });
    }
  }
  return { n, edges };
}

/** Cadeia dirigida 0 → 1 → … → n−1, já posicionada em linha. */
export function generateLinear(n: number, opts: GeneratorOptions = {}): GeneratedGraph {
  const rng = opts.rng ?? Math.random;
  const weight = weightFn(opts, rng);
  const edges: GenEdge[] = [];
  for (let i = 0; i < n - 1; i++) edges.push({ u: i, v: i + 1, w: weight(), bidirectional: false });
  const positions = new Float64Array(2 * n);
  for (let i = 0; i < n; i++) positions[2 * i] = i * GRID_SPACING;
  return { n, edges, positions };
}

/** Grade rows×cols não direcionada (4 vizinhos), já posicionada. */
export function generateGrid(rows: number, cols: number, opts: GeneratorOptions = {}): GeneratedGraph {
  const rng = opts.rng ?? Math.random;
  const weight = weightFn(opts, rng);
  const n = rows * cols;
  const edges: GenEdge[] = [];
  const positions = new Float64Array(2 * n);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = r * cols + c;
      positions[2 * u] = c * GRID_SPACING;
      positions[2 * u + 1] = r * GRID_SPACING;
      if (c + 1 < cols) edges.push({ u, v: u + 1, w: weight(), bidirectional: true });
      if (r + 1 < rows) edges.push({ u, v: u + cols, w: weight(), bidirectional: true });
    }
  }
  return { n, edges, positions };
}

/**
 * DAG: gerado com arcos de índice menor para maior (E ≈ 2V) e depois com os
 * rótulos embaralhados (continua acíclico); todos alcançáveis a partir de 0. Com `negative`, ~30% dos pesos ficam negativos (sem ciclos, é
 * sempre válido).
 */
export function generateDag(n: number, opts: GeneratorOptions & { negative?: boolean } = {}): GeneratedGraph {
  const rng = opts.rng ?? Math.random;
  const base = weightFn(opts, rng);
  const weight = opts.negative ? () => (rng() < 0.3 ? -randInt(rng, 1, 5) : base()) : base;
  return { n, edges: randomDirected(n, 2, rng, weight, true) };
}

/**
 * Pesos negativos SEM ciclo negativo: parte de pesos w ≥ 1 e aplica potenciais
 * p, w' = w + p(u) − p(v). Todo ciclo mantém a soma original (> 0), mas muitos
 * arcos ficam negativos.
 */
export function generateNegativeWeights(n: number, opts: GeneratorOptions = {}): GeneratedGraph {
  const rng = opts.rng ?? Math.random;
  const gen = generateSparse(n, { ...opts, weights: "random", rng });
  const p = Array.from({ length: n }, () => randInt(rng, 0, 12));
  for (const e of gen.edges) e.w = e.w + p[e.u] - p[e.v];
  return gen;
}

/** Esparso + ciclo 0 → 1 → 2 → 0 de soma −3, alcançável a partir de 0. */
export function generateNegativeCycle(n: number, opts: GeneratorOptions = {}): GeneratedGraph {
  const gen = generateSparse(Math.max(3, n), opts);
  gen.edges = gen.edges.filter(
    (e) => !((e.u === 0 && e.v === 1) || (e.u === 1 && e.v === 2) || (e.u === 2 && e.v === 0))
  );
  gen.edges.push(
    { u: 0, v: 1, w: 1, bidirectional: false },
    { u: 1, v: 2, w: 1, bidirectional: false },
    { u: 2, v: 0, w: -5, bidirectional: false }
  );
  return gen;
}

/** Duas componentes esparsas independentes: a segunda é inalcançável a partir de 0. */
export function generateDisconnected(n: number, opts: GeneratorOptions = {}): GeneratedGraph {
  const rng = opts.rng ?? Math.random;
  const half = Math.max(1, Math.floor(n / 2));
  const a = randomDirected(half, 2, rng, weightFn(opts, rng));
  const b = randomDirected(n - half, 2, rng, weightFn(opts, rng)).map((e) => ({
    ...e,
    u: e.u + half,
    v: e.v + half,
  }));
  return { n, edges: [...a, ...b] };
}

/**
 * Geométrico não direcionado: pontos aleatórios no plano, cada um ligado aos
 * `k` vizinhos mais próximos, peso proporcional à distância (≥ 1). Componentes
 * soltas são ligadas pelo par mais próximo. Posições reais tornam a heurística
 * do A* informativa.
 */
export function generateGeometric(n: number, opts: GeneratorOptions & { k?: number } = {}): GeneratedGraph {
  const rng = opts.rng ?? Math.random;
  const k = Math.min(opts.k ?? 3, Math.max(0, n - 1));
  const side = GRID_SPACING * Math.sqrt(n);
  const positions = samplePoints(n, side, GRID_SPACING * 0.55, rng);
  const dist = (a: number, b: number) =>
    Math.hypot(positions[2 * a] - positions[2 * b], positions[2 * a + 1] - positions[2 * b + 1]);
  const toWeight = (d: number) => (opts.weights === "unit" ? 1 : Math.max(1, Math.round(d / 20)));

  // Baldes espaciais para achar vizinhos próximos sem O(n²).
  const cell = GRID_SPACING * 1.5;
  const cols = Math.max(1, Math.ceil(side / cell));
  const buckets = new Map<number, number[]>();
  const bucketOf = (i: number) =>
    Math.min(cols - 1, Math.floor(positions[2 * i + 1] / cell)) * cols +
    Math.min(cols - 1, Math.floor(positions[2 * i] / cell));
  for (let i = 0; i < n; i++) {
    const b = bucketOf(i);
    const list = buckets.get(b);
    if (list) list.push(i);
    else buckets.set(b, [i]);
  }

  const edges: GenEdge[] = [];
  const seen = new Set<number>();
  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) x = parent[x] = parent[parent[x]];
    return x;
  };
  const link = (a: number, b: number) => {
    const key = Math.min(a, b) * n + Math.max(a, b);
    if (a === b || seen.has(key)) return;
    seen.add(key);
    edges.push({ u: a, v: b, w: toWeight(dist(a, b)), bidirectional: true });
    parent[find(a)] = find(b);
  };

  for (let i = 0; i < n; i++) {
    const r0 = Math.floor(bucketOf(i) / cols);
    const c0 = bucketOf(i) % cols;
    let cand: number[] = [];
    for (let ring = 1; ring <= cols; ring++) {
      cand = [];
      for (let r = r0 - ring; r <= r0 + ring; r++) {
        for (let c = c0 - ring; c <= c0 + ring; c++) {
          if (r < 0 || c < 0 || r >= cols || c >= cols) continue;
          for (const j of buckets.get(r * cols + c) ?? []) if (j !== i) cand.push(j);
        }
      }
      if (cand.length >= k) break;
    }
    cand.sort((a, b) => dist(i, a) - dist(i, b));
    for (const j of cand.slice(0, k)) link(i, j);
  }

  // Liga componentes restantes (raízes em ordem de x) pelo vértice mais próximo.
  const roots = [...new Set(Array.from({ length: n }, (_, i) => find(i)))];
  if (roots.length > 1) {
    const members = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
      const r = find(i);
      const list = members.get(r);
      if (list) list.push(i);
      else members.set(r, [i]);
    }
    const comps = [...members.values()].sort((a, b) => positions[2 * a[0]] - positions[2 * b[0]]);
    for (let c = 1; c < comps.length; c++) {
      let best = [comps[c - 1][0], comps[c][0]];
      let bestD = Infinity;
      for (const a of comps[c - 1].slice(0, 200)) {
        for (const b of comps[c].slice(0, 200)) {
          const d = dist(a, b);
          if (d < bestD) {
            bestD = d;
            best = [a, b];
          }
        }
      }
      link(best[0], best[1]);
    }
  }
  return { n, edges, positions };
}

/**
 * Pontos aleatórios num quadrado com distância mínima entre eles (amostragem
 * por rejeição com grade auxiliar), para que os nós não se sobreponham no
 * desenho. Após 30 tentativas sem sucesso, aceita o ponto mesmo assim.
 */
function samplePoints(n: number, side: number, minDist: number, rng: () => number): Float64Array {
  const pos = new Float64Array(2 * n);
  const cell = minDist / Math.SQRT2;
  const cols = Math.max(1, Math.ceil(side / cell));
  const grid = new Int32Array(cols * cols).fill(-1);
  for (let i = 0; i < n; i++) {
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 30; attempt++) {
      x = rng() * side;
      y = rng() * side;
      const cx = Math.min(cols - 1, Math.floor(x / cell));
      const cy = Math.min(cols - 1, Math.floor(y / cell));
      let ok = true;
      for (let dy = -2; dy <= 2 && ok; dy++) {
        for (let dx = -2; dx <= 2 && ok; dx++) {
          const gx = cx + dx;
          const gy = cy + dy;
          if (gx < 0 || gy < 0 || gx >= cols || gy >= cols) continue;
          const j = grid[gy * cols + gx];
          if (j !== -1 && Math.hypot(pos[2 * j] - x, pos[2 * j + 1] - y) < minDist) ok = false;
        }
      }
      if (ok) break;
    }
    pos[2 * i] = x;
    pos[2 * i + 1] = y;
    grid[Math.min(cols - 1, Math.floor(y / cell)) * cols + Math.min(cols - 1, Math.floor(x / cell))] = i;
  }
  return pos;
}

export type PresetKind =
  | "sparse"
  | "dense"
  | "linear"
  | "grid"
  | "geometric"
  | "dag"
  | "negativeWeights"
  | "negativeCycle"
  | "disconnected";

export type PresetParams = { n: number; rows: number; cols: number; weights: WeightMode; seed?: number };

export function buildPreset(kind: PresetKind, p: PresetParams): GeneratedGraph {
  const opts: GeneratorOptions = { weights: p.weights, rng: p.seed != null ? createRng(p.seed) : Math.random };
  switch (kind) {
    case "sparse":
      return generateSparse(p.n, opts);
    case "dense":
      return generateDense(p.n, opts);
    case "linear":
      return generateLinear(p.n, opts);
    case "grid":
      return generateGrid(p.rows, p.cols, opts);
    case "geometric":
      return generateGeometric(p.n, opts);
    case "dag":
      return generateDag(p.n, { ...opts, negative: p.weights !== "unit" });
    case "negativeWeights":
      return generateNegativeWeights(p.n, opts);
    case "negativeCycle":
      return generateNegativeCycle(p.n, opts);
    case "disconnected":
      return generateDisconnected(p.n, opts);
  }
}
