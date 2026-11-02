/**
 * Cenários dos experimentos (todos determinísticos, com sementes fixas).
 * Usam os mesmos geradores e modelos da ferramenta; onde a ferramenta não tem
 * um gerador com o parâmetro desejado (densidade variável, armadilha em U,
 * destino a uma distância escolhida), o cenário é montado aqui com os mesmos
 * tipos de dados (`GraphInstance`, `MazeGrid`).
 */
import { buildInstance } from "../../src/graph/types";
import type { Graph, GraphInstance } from "../../src/graph/types";
import type { GraphQuery } from "../../src/graph/algorithms/types";
import {
  generateDag,
  generateDisconnected,
  generateGeometric,
  generateGrid,
  generateNegativeCycle,
  generateNegativeWeights,
  generatedToGraph,
} from "../../src/graph/generators";
import type { GeneratedGraph } from "../../src/graph/generators";
import { growthInstance } from "../../src/graph/benchmark/runner";
import { createRng } from "../../src/utils/random";
import { generateMaze } from "../../src/maze/generator";
import { cellIndex, createEmptyMaze } from "../../src/maze/model";
import type { MazeGrid } from "../../src/maze/model";

export type GraphScenario = {
  experiment: string;
  id: string;
  description: string;
  /** Valor do eixo x nos gráficos (n, grau médio etc.). */
  x: number;
  g: GraphInstance;
  query: GraphQuery;
  edgeCounts: { directed: number; undirected: number };
  samples: number;
};

function fromGenerated(gen: GeneratedGraph) {
  const undirected = gen.edges.filter((e) => e.bidirectional).length;
  return {
    g: buildInstance(generatedToGraph(gen), gen.positions ?? null),
    edgeCounts: { directed: gen.edges.length - undirected, undirected },
  };
}

/**
 * Grafo dirigido aleatório: arborescência a partir de 0 + arcos extras até grau
 * médio `d`; pesos 1–10. Rótulos 1..n−1 embaralhados (ver shuffleLabels em
 * src/graph/generators.ts) para que a ordem dos índices não favoreça o Bellman-Ford.
 */
function randomDirected(n: number, d: number, seed: number): Graph {
  const rng = createRng(seed);
  const label = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 1; i--) {
    const j = 1 + Math.floor(rng() * i);
    [label[i], label[j]] = [label[j], label[i]];
  }
  const g: Graph = Array.from({ length: n }, () => []);
  const seen = new Set<number>();
  let m = 0;
  const add = (u: number, v: number) => {
    if (u === v || seen.has(u * n + v)) return;
    seen.add(u * n + v);
    g[label[u]].push({ to: label[v], weight: 1 + Math.floor(rng() * 10) });
    m++;
  };
  for (let v = 1; v < n; v++) add(Math.floor(rng() * v), v);
  const target = Math.min(n * d, n * (n - 1));
  if (target >= n * (n - 1) * 0.5) {
    // Muito denso: percorre todos os pares com probabilidade ajustada.
    const p = target / (n * (n - 1));
    for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) if (rng() < p) add(u, v);
  } else {
    while (m < target) add(Math.floor(rng() * n), Math.floor(rng() * n));
  }
  return g;
}

export function graphScenarios(): GraphScenario[] {
  const out: GraphScenario[] = [];

  // G1 — escalabilidade em grafos esparsos geométricos (o mesmo gerador da curva de crescimento).
  for (const n of [500, 1000, 2000, 5000, 10000, 20000]) {
    const { g, query } = growthInstance(n, 1);
    out.push({
      experiment: "G1",
      id: `G1-n${n}`,
      description: `Geométrico não direcionado, k = 3 vizinhos, n = ${n}`,
      x: n,
      g,
      query,
      edgeCounts: { directed: 0, undirected: g.targets.length / 2 },
      samples: n >= 10000 ? 3 : 5,
    });
  }

  // G2 — densidade: n = 400 fixo, grau médio de saída variável (dirigido, pesos 1–10, sem posições).
  for (const d of [2, 8, 32, 128, 399]) {
    const n = 400;
    const g = buildInstance(randomDirected(n, d, 100 + d));
    out.push({
      experiment: "G2",
      id: `G2-d${d}`,
      description: `Dirigido aleatório, n = 400, grau médio ≈ ${d}`,
      x: d,
      g,
      query: { source: 0, target: n - 1 },
      edgeCounts: { directed: g.targets.length, undirected: 0 },
      samples: 5,
    });
  }

  // G3 — pesos negativos sem ciclo negativo.
  for (const n of [200, 1000, 3000]) {
    const { g, edgeCounts } = fromGenerated(generateNegativeWeights(n, { rng: createRng(300 + n) }));
    out.push({
      experiment: "G3",
      id: `G3-n${n}`,
      description: `Dirigido esparso (E ≈ 2V) com pesos negativos sem ciclo negativo, n = ${n}`,
      x: n,
      g,
      query: { source: 0, target: n - 1 },
      edgeCounts,
      samples: 5,
    });
  }

  // G4 — DAGs (com e sem pesos negativos).
  for (const negative of [false, true]) {
    for (const n of [1000, 5000, 20000]) {
      const { g, edgeCounts } = fromGenerated(generateDag(n, { rng: createRng(400 + n), negative }));
      out.push({
        experiment: negative ? "G4neg" : "G4pos",
        id: `G4-${negative ? "neg" : "pos"}-n${n}`,
        description: `DAG (E ≈ 2V) ${negative ? "com ~30% de pesos negativos" : "com pesos 1–10"}, n = ${n}`,
        x: n,
        g,
        query: { source: 0, target: n - 1 },
        edgeCounts,
        samples: 5,
      });
    }
  }

  // G5 — grade com pesos unitários (BFS compatível).
  for (const side of [30, 100]) {
    const { g, edgeCounts } = fromGenerated(generateGrid(side, side, { weights: "unit" }));
    out.push({
      experiment: "G5",
      id: `G5-${side}x${side}`,
      description: `Grade ${side}×${side} não direcionada, pesos = 1`,
      x: side * side,
      g,
      query: { source: 0, target: side * side - 1 },
      edgeCounts,
      samples: 5,
    });
  }

  // G6 — todos os pares: esparso (geométrico) vs. denso (grau ≈ n/2).
  for (const n of [100, 200, 400, 600]) {
    const geo = fromGenerated(generateGeometric(n, { rng: createRng(600 + n) }));
    out.push({
      experiment: "G6sparse",
      id: `G6-sparse-n${n}`,
      description: `APSP — geométrico esparso, n = ${n}`,
      x: n,
      g: geo.g,
      query: { source: 0, target: n - 1 },
      edgeCounts: geo.edgeCounts,
      samples: 3,
    });
    const dense = buildInstance(randomDirected(n, n / 2, 700 + n));
    out.push({
      experiment: "G6dense",
      id: `G6-dense-n${n}`,
      description: `APSP — dirigido denso (grau ≈ n/2), n = ${n}`,
      x: n,
      g: dense,
      query: { source: 0, target: n - 1 },
      edgeCounts: { directed: dense.targets.length, undirected: 0 },
      samples: 3,
    });
  }

  // G7 — ciclo negativo alcançável.
  {
    const { g, edgeCounts } = fromGenerated(generateNegativeCycle(500, { rng: createRng(7) }));
    out.push({
      experiment: "G7",
      id: "G7-negcycle-n500",
      description: "Dirigido esparso com ciclo negativo 0 → 1 → 2 → 0, n = 500",
      x: 500,
      g,
      query: { source: 0, target: 499 },
      edgeCounts,
      samples: 5,
    });
  }

  // G8 — desconexo: metade dos vértices inalcançável.
  {
    const { g, edgeCounts } = fromGenerated(generateDisconnected(10000, { rng: createRng(8) }));
    out.push({
      experiment: "G8",
      id: "G8-disconnected-n10000",
      description: "Duas componentes dirigidas (5.000 + 5.000), origem na primeira",
      x: 10000,
      g,
      query: { source: 0, target: 9999 },
      edgeCounts,
      samples: 5,
    });
  }

  // G9 — efeito da numeração dos vértices (mesma estrutura, rótulos ordenados vs. embaralhados).
  {
    const n = 20000;
    const rng = createRng(900);
    const ordered: Graph = Array.from({ length: n }, () => []);
    const seen = new Set<number>();
    const add = (u: number, v: number) => {
      if (u === v || seen.has(u * n + v)) return;
      seen.add(u * n + v);
      ordered[u].push({ to: v, weight: 1 + Math.floor(rng() * 10) });
    };
    for (let v = 1; v < n; v++) add(Math.floor(rng() * v), v);
    while (seen.size < 2 * n) {
      const a = Math.floor(rng() * n);
      const b = Math.floor(rng() * n);
      add(Math.min(a, b), Math.max(a, b));
    }
    const label = Array.from({ length: n }, (_, i) => i);
    const r2 = createRng(901);
    for (let i = n - 1; i > 1; i--) {
      const j = 1 + Math.floor(r2() * i);
      [label[i], label[j]] = [label[j], label[i]];
    }
    const shuffled: Graph = Array.from({ length: n }, () => []);
    ordered.forEach((adj, u) => adj.forEach((e) => shuffled[label[u]].push({ to: label[e.to], weight: e.weight })));
    for (const [variant, gr, x] of [["ordenado", ordered, 0], ["embaralhado", shuffled, 1]] as const) {
      const g = buildInstance(gr);
      out.push({
        experiment: "G9dag",
        id: `G9-dag-${variant}`,
        description: `DAG n = 20.000 (E ≈ 2V), rótulos ${variant}`,
        x,
        g,
        query: { source: 0, target: variant === "ordenado" ? n - 1 : label[n - 1] },
        edgeCounts: { directed: g.targets.length, undirected: 0 },
        samples: 5,
      });
    }
    // Grade 100×100 com pesos 1–10: origem no canto (índice 0, ordem por linhas) vs. no canto oposto.
    const grid = generateGrid(100, 100, { rng: createRng(902) });
    const gg = fromGenerated(grid);
    for (const [variant, source, x] of [["origem no índice 0", 0, 0], ["origem no último índice", 9999, 1]] as const) {
      out.push({
        experiment: "G9grid",
        id: `G9-grid-${x}`,
        description: `Grade 100×100, pesos 1–10, ${variant}`,
        x,
        g: gg.g,
        query: { source, target: 9999 - source },
        edgeCounts: gg.edgeCounts,
        samples: 5,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------- labirintos

export type MazeScenario = {
  experiment: string;
  id: string;
  description: string;
  x: number;
  grid: MazeGrid;
};

/** Grid com obstáculos aleatórios (densidade p), cantos livres; procura uma semente solucionável. */
function randomObstacles(size: number, p: number, seed: number): MazeGrid {
  for (let s = seed; ; s++) {
    const rng = createRng(s);
    const g = createEmptyMaze(size);
    for (let i = 0; i < g.walls.length; i++) if (rng() < p) g.walls[i] = 1;
    g.walls[g.start!] = 0;
    g.walls[g.goal!] = 0;
    if (bfsHops(g, g.start!)[g.goal!] >= 0) return g;
  }
}

/** Saltos a partir de `from` (−1 = inalcançável). */
export function bfsHops(g: MazeGrid, from: number): Int32Array {
  const n = g.size;
  const d = new Int32Array(n * n).fill(-1);
  const q = [from];
  d[from] = 0;
  for (let h = 0; h < q.length; h++) {
    const u = q[h];
    const r = Math.floor(u / n);
    const c = u % n;
    for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
      if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
      const v = nr * n + nc;
      if (g.walls[v] || d[v] !== -1) continue;
      d[v] = d[u] + 1;
      q.push(v);
    }
  }
  return d;
}

/** Grid aberto com uma "taça" em U voltada para o início, entre início e destino. */
function uTrap(size: number): MazeGrid {
  const g = createEmptyMaze(size);
  const mid = Math.floor(size / 2);
  const top = Math.floor(size * 0.2);
  const bottom = Math.floor(size * 0.8);
  const back = Math.floor(size * 0.6);
  const open = Math.floor(size * 0.3);
  for (let r = top; r <= bottom; r++) g.walls[cellIndex(size, r, back)] = 1;
  for (let c = open; c <= back; c++) {
    g.walls[cellIndex(size, top, c)] = 1;
    g.walls[cellIndex(size, bottom, c)] = 1;
  }
  g.start = cellIndex(size, mid, Math.floor(size * 0.1));
  g.goal = cellIndex(size, mid, Math.floor(size * 0.9));
  return g;
}

export function mazeScenarios(): MazeScenario[] {
  const out: MazeScenario[] = [];

  // M1 — tamanho (labirinto gerado pela ferramenta, braid padrão 0,08).
  for (const N of [21, 51, 101, 201, 401, 801]) {
    out.push({
      experiment: "M1",
      id: `M1-N${N}`,
      description: `Labirinto gerado ${N}×${N} (braid 0,08)`,
      x: N,
      grid: generateMaze(N, { rng: createRng(1000 + N) }),
    });
  }

  // M2 — estrutura dos obstáculos, N = 101.
  const N = 101;
  const structures: Array<[string, string, MazeGrid]> = [
    ["open", "Grid aberto (sem obstáculos)", createEmptyMaze(N)],
    ["rand25", "Obstáculos aleatórios 25%", randomObstacles(N, 0.25, 2025)],
    ["rand40", "Obstáculos aleatórios 40%", randomObstacles(N, 0.4, 2040)],
    ["perfect", "Labirinto perfeito (braid 0)", generateMaze(N, { rng: createRng(31), braid: 0 })],
    ["braid08", "Labirinto braid 0,08", generateMaze(N, { rng: createRng(31), braid: 0.08 })],
    ["braid30", "Labirinto braid 0,30", generateMaze(N, { rng: createRng(31), braid: 0.3 })],
    ["utrap", "Armadilha em U (grid aberto)", uTrap(N)],
  ];
  structures.forEach(([key, description, grid], i) =>
    out.push({ experiment: "M2", id: `M2-${key}`, description, x: i, grid })
  );

  // M3 — distância início–destino: 201×201 com 25% de obstáculos, início no centro.
  {
    const base = randomObstacles(201, 0.25, 3000);
    // Início: célula livre mais próxima do centro que alcança ≥ 10.000 células
    // (o centro exato pode cair numa ilha cercada por obstáculos).
    let center = -1;
    let hops = new Int32Array(0);
    for (let ring = 0; ring < 100 && center < 0; ring++) {
      for (let r = 100 - ring; r <= 100 + ring && center < 0; r++) {
        for (let c = 100 - ring; c <= 100 + ring && center < 0; c++) {
          const i = cellIndex(201, r, c);
          if (base.walls[i]) continue;
          const h = bfsHops(base, i);
          let reach = 0;
          for (const x of h) if (x >= 0) reach++;
          if (reach >= 10000) {
            center = i;
            hops = h;
          }
        }
      }
    }
    for (const target of [25, 50, 100, 200, 300]) {
      let goal = -1;
      for (let i = 0; i < hops.length; i++) if (hops[i] === target) {
        goal = i;
        break;
      }
      if (goal < 0) continue;
      out.push({
        experiment: "M3",
        id: `M3-d${target}`,
        description: `201×201, 25% obstáculos, destino a ${target} passos do centro`,
        x: target,
        grid: { ...base, walls: base.walls.slice(), start: center, goal },
      });
    }
  }
  // M4 — algoritmos estocásticos (ACO/GA): instâncias pequenas e médias.
  out.push(
    { experiment: "M4", id: "M4-maze41", description: "Labirinto 41×41 (braid 0,08)", x: 0, grid: generateMaze(41, { rng: createRng(41) }) },
    { experiment: "M4", id: "M4-maze101", description: "Labirinto 101×101 (braid 0,08)", x: 1, grid: generateMaze(101, { rng: createRng(4101) }) },
    { experiment: "M4", id: "M4-rand25-51", description: "Grid 51×51 com 25% de obstáculos", x: 2, grid: randomObstacles(51, 0.25, 4051) }
  );
  return out;
}
