/**
 * Quick correctness checks: BMSSP (article) vs classical Dijkstra.
 * Run: npx --yes tsx breaking-sorting-barrier/validate.ts
 */

import { distances, sssp, __internal } from "./algorithm.ts";

type Edge = [number, number, number];

function dijkstra(n: number, edges: Edge[], source: number): number[] {
  const adj: { to: number; w: number }[][] = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) adj[u].push({ to: v, w });

  const dist = Array(n).fill(Infinity);
  const used = Array(n).fill(false);
  dist[source] = 0;

  for (let iter = 0; iter < n; iter++) {
    let u = -1;
    for (let i = 0; i < n; i++) {
      if (!used[i] && (u < 0 || dist[i] < dist[u])) u = i;
    }
    if (u < 0 || dist[u] === Infinity) break;
    used[u] = true;
    for (const { to, w } of adj[u]) {
      if (dist[u] + w < dist[to]) dist[to] = dist[u] + w;
    }
  }
  return dist;
}

function assertSame(label: string, a: number[], b: number[]): void {
  if (a.length !== b.length) throw new Error(`${label}: length mismatch`);
  for (let i = 0; i < a.length; i++) {
    const ok =
      a[i] === b[i] ||
      (a[i] === Infinity && b[i] === Infinity) ||
      (Number.isFinite(a[i]) && Number.isFinite(b[i]) && Math.abs(a[i] - b[i]) < 1e-9);
    if (!ok) {
      throw new Error(`${label}: vertex ${i}: got ${a[i]}, expected ${b[i]}`);
    }
  }
  console.log(`OK  ${label}`);
}

function caseSingleVertex(): void {
  const d = distances(1, [], 0);
  assertSame("single vertex", d, [0]);
}

function caseLine(): void {
  const edges: Edge[] = [
    [0, 1, 1],
    [1, 2, 1],
    [2, 3, 1],
  ];
  assertSame("line", distances(4, edges, 0), dijkstra(4, edges, 0));
}

function caseDiamond(): void {
  const edges: Edge[] = [
    [0, 1, 1],
    [0, 2, 4],
    [1, 2, 1],
    [1, 3, 5],
    [2, 3, 1],
  ];
  assertSame("diamond", distances(4, edges, 0), dijkstra(4, edges, 0));
}

function caseZeroWeights(): void {
  const edges: Edge[] = [
    [0, 1, 0],
    [1, 2, 0],
    [0, 2, 5],
  ];
  assertSame("zero weights", distances(3, edges, 0), dijkstra(3, edges, 0));
}

function caseDisconnected(): void {
  const edges: Edge[] = [[0, 1, 2]];
  assertSame("disconnected", distances(3, edges, 0), dijkstra(3, edges, 0));
}

function caseEqualPaths(): void {
  // Two equal-length paths 0→1→3 and 0→2→3; total order must keep a tree.
  const edges: Edge[] = [
    [0, 1, 1],
    [0, 2, 1],
    [1, 3, 1],
    [2, 3, 1],
  ];
  assertSame("equal path lengths", distances(4, edges, 0), dijkstra(4, edges, 0));
}

function caseLargerSparse(): void {
  const n = 40;
  const edges: Edge[] = [];
  for (let i = 0; i < n - 1; i++) {
    edges.push([i, i + 1, 1 + (i % 5)]);
    if (i + 3 < n) edges.push([i, i + 3, 2 + (i % 3)]);
  }
  assertSame("sparse n=40", distances(n, edges, 0), dijkstra(n, edges, 0));
}

function caseRandom(seed: number, n: number, m: number): void {
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  const edges: Edge[] = [];
  for (let i = 0; i < m; i++) {
    const u = Math.floor(rnd() * n);
    const v = Math.floor(rnd() * n);
    if (u === v) continue;
    edges.push([u, v, rnd() * 10]);
  }
  // Ensure reachability chain so the instance is closer to the article's assumption.
  for (let i = 0; i < n - 1; i++) edges.push([i, i + 1, 1]);

  assertSame(`random n=${n} seed=${seed}`, distances(n, edges, 0), dijkstra(n, edges, 0));
}

function caseZeroHeavy(seed: number, n: number): void {
  // Many zero-weight edges → many equal numeric distances (stresses the total order).
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  const edges: Edge[] = [];
  for (let i = 0; i < n - 1; i++) edges.push([i, i + 1, rnd() < 0.5 ? 0 : 1]);
  for (let i = 0; i < n * 3; i++) {
    const u = Math.floor(rnd() * n);
    const v = Math.floor(rnd() * n);
    if (u !== v) edges.push([u, v, rnd() < 0.4 ? 0 : Math.floor(rnd() * 4)]);
  }
  assertSame(`zero-heavy n=${n}`, distances(n, edges, 0), dijkstra(n, edges, 0));
}

function caseConstantDegreePorts(): void {
  const edges: Edge[] = [
    [0, 1, 3],
    [0, 2, 1],
    [2, 1, 1],
    [1, 3, 2],
    [2, 3, 5],
  ];
  const t = __internal.toConstantDegree(__internal.buildGraph(4, edges), 0);
  // Every gadget vertex should have out-degree ≤ 2 and in-degree ≤ 2.
  const indeg = Array(t.graph.n).fill(0);
  for (let u = 0; u < t.graph.n; u++) {
    if (t.graph.adj[u].length > 2) {
      throw new Error(`out-degree > 2 at gadget vertex ${u}`);
    }
    for (const e of t.graph.adj[u]) indeg[e.to]++;
  }
  for (let i = 0; i < indeg.length; i++) {
    if (indeg[i] > 2) throw new Error(`in-degree > 2 at gadget vertex ${i}`);
  }
  console.log("OK  constant-degree transform degrees");
  assertSame("after transform distances", distances(4, edges, 0), dijkstra(4, edges, 0));
}

function casePredTree(): void {
  const edges: Edge[] = [
    [0, 1, 1],
    [1, 2, 1],
    [0, 2, 10],
  ];
  const { distances: d, predecessors } = sssp(3, edges, 0);
  assertSame("pred distances", d, [0, 1, 2]);
  if (predecessors[1] !== 0) throw new Error(`pred[1]=${predecessors[1]}`);
  if (predecessors[2] !== 1) throw new Error(`pred[2]=${predecessors[2]}`);
  console.log("OK  predecessor tree");
}

caseSingleVertex();
caseLine();
caseDiamond();
caseZeroWeights();
caseDisconnected();
caseEqualPaths();
caseLargerSparse();
caseRandom(1, 25, 80);
caseRandom(2, 50, 120);
for (let seed = 3; seed <= 12; seed++) caseRandom(seed, 60, 200);
caseRandom(99, 150, 600);
caseRandom(100, 200, 500);
caseZeroHeavy(7, 80);
caseConstantDegreePorts();
casePredTree();

console.log("\nAll validation checks passed.");
