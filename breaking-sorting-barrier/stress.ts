import { distances } from "./algorithm.ts";

type Edge = [number, number, number];

function dijkstra(n: number, edges: Edge[], source: number): number[] {
  const adj: { to: number; w: number }[][] = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) adj[u].push({ to: v, w });
  const dist = Array(n).fill(Infinity);
  const used = Array(n).fill(false);
  dist[source] = 0;
  for (let it = 0; it < n; it++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!used[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] === Infinity) break;
    used[u] = true;
    for (const { to, w } of adj[u]) if (dist[u] + w < dist[to]) dist[to] = dist[u] + w;
  }
  return dist;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function same(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    const ok =
      a[i] === b[i] ||
      (Number.isFinite(a[i]) && Number.isFinite(b[i]) && Math.abs(a[i] - b[i]) < 1e-9);
    if (!ok) return i;
  }
  return -1;
}

let failures = 0;
let checked = 0;
const start = Date.now();

for (let trial = 0; trial < 3000; trial++) {
  const r = rng(trial + 1);
  const n = 2 + Math.floor(r() * 80);
  const density = r();
  const m = Math.floor(n * (0.5 + density * 4));
  const edges: Edge[] = [];
  for (let i = 0; i < m; i++) {
    const u = Math.floor(r() * n);
    const v = Math.floor(r() * n);
    if (u === v) continue;
    // Mix of zero and positive weights.
    const w = r() < 0.3 ? 0 : Math.round(r() * 20 * 1000) / 1000;
    edges.push([u, v, w]);
  }
  const source = Math.floor(r() * n);
  const got = distances(n, edges, source);
  const exp = dijkstra(n, edges, source);
  checked++;
  const bad = same(got, exp);
  if (bad >= 0) {
    failures++;
    if (failures <= 5) {
      console.log(`FAIL trial=${trial} n=${n} src=${source} vertex=${bad} got=${got[bad]} exp=${exp[bad]}`);
      console.log(JSON.stringify(edges));
    }
  }
}

console.log(`\nchecked=${checked} failures=${failures} elapsed=${Date.now() - start}ms`);
if (failures === 0) console.log("STRESS PASSED");
