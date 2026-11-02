import type { GraphInstance } from "../types";
import { MinHeap } from "./minHeap";
import { newCounters } from "./types";
import type { AlgorithmOutput } from "./types";

/**
 * Floyd-Warshall: programação dinâmica sobre vértices intermediários.
 * O(V³) tempo e O(V²) memória; aceita pesos negativos. Há ciclo negativo se
 * alguma distância d[i][i] fica < 0 (distâncias por ele ficam indefinidas).
 * Expansão = vértice intermediário k processado (= V);
 * arcos examinados = comparações d[i][k] + d[k][j] < d[i][j].
 */
export function floydWarshall(g: GraphInstance): AlgorithmOutput {
  const { n, offsets, targets, weights } = g;
  const dist = new Float64Array(n * n).fill(Infinity);
  const pred = new Int32Array(n * n).fill(-1);
  const c = newCounters();
  for (let i = 0; i < n; i++) dist[i * n + i] = 0;
  for (let u = 0; u < n; u++) {
    for (let k = offsets[u]; k < offsets[u + 1]; k++) {
      const idx = u * n + targets[k];
      if (weights[k] < dist[idx]) {
        dist[idx] = weights[k];
        pred[idx] = u;
      }
    }
  }

  let comparisons = 0;
  let relaxations = 0;
  for (let k = 0; k < n; k++) {
    const rowK = k * n;
    for (let i = 0; i < n; i++) {
      const dik = dist[i * n + k];
      if (dik === Infinity) continue;
      const rowI = i * n;
      for (let j = 0; j < n; j++) {
        const nd = dik + dist[rowK + j];
        comparisons++;
        if (nd < dist[rowI + j]) {
          dist[rowI + j] = nd;
          pred[rowI + j] = pred[rowK + j];
          relaxations++;
        }
      }
    }
  }

  let negativeCycle = false;
  for (let i = 0; i < n; i++) if (dist[i * n + i] < 0) negativeCycle = true;
  c.expansions = n;
  c.edgeScans = comparisons;
  c.relaxations = relaxations;
  c.extra = { matrixCells: n * n };
  return { kind: "apsp", negativeCycle, dist, pred, counters: c };
}

/**
 * Johnson: Bellman-Ford a partir de uma origem virtual (arcos de peso 0 para
 * todos) gera potenciais h; os pesos w'(u,v) = w + h(u) − h(v) ficam ≥ 0 e um
 * Dijkstra por vértice resolve todos os pares. O(V·E·log V) — bom para grafos
 * esparsos com pesos negativos. Aborta se houver ciclo negativo.
 * Expansão = vértice fixado, somando os V Dijkstras.
 */
export function johnson(g: GraphInstance): AlgorithmOutput {
  const { n, offsets, targets, weights } = g;
  const c = newCounters();

  // 1) Potenciais: Bellman-Ford com origem virtual (h = 0 para todos no início).
  const h = new Float64Array(n);
  let rounds = 0;
  let changed = true;
  for (let r = 0; r < n && changed; r++) {
    rounds++;
    changed = false;
    for (let u = 0; u < n; u++) {
      const hu = h[u];
      for (let k = offsets[u]; k < offsets[u + 1]; k++) {
        c.edgeScans++;
        const v = targets[k];
        if (hu + weights[k] < h[v]) {
          h[v] = hu + weights[k];
          changed = true;
          c.relaxations++;
        }
      }
    }
  }
  if (changed) {
    // Ainda relaxou após n rodadas (n+1 vértices com o virtual): ciclo negativo.
    c.extra = { bellmanFordRounds: rounds, dijkstraRuns: 0 };
    return { kind: "apsp", negativeCycle: true, dist: new Float64Array(0), pred: new Int32Array(0), counters: c };
  }

  // 2) Reponderação (erros de arredondamento podem gerar −1e-15: trunca em 0).
  const rw = new Float64Array(weights.length);
  for (let u = 0; u < n; u++) {
    for (let k = offsets[u]; k < offsets[u + 1]; k++) {
      rw[k] = Math.max(0, weights[k] + h[u] - h[targets[k]]);
    }
  }

  // 3) Um Dijkstra por origem sobre os pesos reponderados.
  const dist = new Float64Array(n * n).fill(Infinity);
  const pred = new Int32Array(n * n).fill(-1);
  const d = new Float64Array(n);
  const done = new Uint8Array(n);
  const heap = new MinHeap(Math.min(n, 1024));
  let heapPushes = 0;
  for (let s = 0; s < n; s++) {
    d.fill(Infinity);
    done.fill(0);
    const row = s * n;
    d[s] = 0;
    heap.size = 0;
    heap.push(0, s);
    heapPushes++;
    while (heap.size > 0) {
      const u = heap.pop();
      if (done[u] === 1 || heap.poppedKey > d[u]) continue;
      done[u] = 1;
      c.expansions++;
      const du = d[u];
      for (let k = offsets[u]; k < offsets[u + 1]; k++) {
        c.edgeScans++;
        const v = targets[k];
        const nd = du + rw[k];
        if (nd < d[v]) {
          d[v] = nd;
          pred[row + v] = u;
          heap.push(nd, v);
          heapPushes++;
          c.relaxations++;
        }
      }
    }
    for (let v = 0; v < n; v++) {
      if (d[v] !== Infinity) dist[row + v] = d[v] - h[s] + h[v];
    }
  }
  c.extra = { bellmanFordRounds: rounds, dijkstraRuns: n, heapPushes };
  return { kind: "apsp", negativeCycle: false, dist, pred, counters: c };
}
