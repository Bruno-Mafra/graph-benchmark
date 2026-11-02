import type { GraphInstance } from "../types";
import { topologicalOrder } from "../analysis";
import { MinHeap } from "./minHeap";
import { newCounters } from "./types";
import type { AlgorithmOutput, Counters } from "./types";

/** Caminho origem → alvo seguindo `prev`; null se inalcançável ou distância indefinida (−∞). */
export function pathFromPrev(prev: Int32Array, dist: Float64Array, source: number, target: number): number[] | null {
  if (!Number.isFinite(dist[target])) return null;
  const path = [target];
  for (let v = target; v !== source; ) {
    v = prev[v];
    if (v === -1 || path.length > prev.length) return null;
    path.push(v);
  }
  return path.reverse();
}

/**
 * Núcleo do Dijkstra (heap binária com remoção preguiçosa). Para assim que
 * `stopAt` é fixado (versão origem → destino). Exige pesos ≥ 0.
 * Expansão = vértice retirado da heap com distância definitiva.
 */
function dijkstraCore(g: GraphInstance, source: number, stopAt: number) {
  const { n, offsets, targets, weights } = g;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  const heap = new MinHeap(Math.min(n, 1024));
  const c = newCounters();
  let heapPushes = 1;
  let heapPops = 0;

  dist[source] = 0;
  heap.push(0, source);
  while (heap.size > 0) {
    const u = heap.pop();
    heapPops++;
    if (done[u] === 1 || heap.poppedKey > dist[u]) continue;
    done[u] = 1;
    c.expansions++;
    if (u === stopAt) break;
    const du = dist[u];
    for (let k = offsets[u]; k < offsets[u + 1]; k++) {
      c.edgeScans++;
      const v = targets[k];
      const nd = du + weights[k];
      if (nd < dist[v]) {
        dist[v] = nd;
        prev[v] = u;
        heap.push(nd, v);
        heapPushes++;
        c.relaxations++;
      }
    }
  }
  c.extra = { heapPushes, heapPops };
  return { dist, prev, counters: c };
}

/** Dijkstra de origem única. O((V + E) log V). */
export function dijkstra(g: GraphInstance, source: number): AlgorithmOutput {
  const r = dijkstraCore(g, source, -1);
  return { kind: "sssp", negativeCycle: false, ...r };
}

/** Dijkstra com parada no destino (referência justa para buscas origem → destino). */
export function dijkstraToTarget(g: GraphInstance, source: number, target: number): AlgorithmOutput {
  const r = dijkstraCore(g, source, target);
  return {
    kind: "p2p",
    distance: r.dist[target],
    path: pathFromPrev(r.prev, r.dist, source, target),
    counters: r.counters,
  };
}

/**
 * Bellman-Ford: até V−1 rodadas relaxando todos os arcos que saem de vértices
 * já alcançados (para cedo se uma rodada não muda nada). Se a rodada V ainda
 * relaxa, há ciclo negativo alcançável: os vértices afetados (alcançáveis a
 * partir dele) recebem distância −∞. O(V·E).
 * Expansão = vértice com distância finita processado em uma rodada (somando rodadas).
 */
export function bellmanFord(g: GraphInstance, source: number): AlgorithmOutput {
  const { n, offsets, targets, weights } = g;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const c = newCounters();
  dist[source] = 0;

  let rounds = 0;
  let changed = true;
  for (let i = 0; i < n - 1 && changed; i++) {
    rounds++;
    changed = false;
    for (let u = 0; u < n; u++) {
      const du = dist[u];
      if (du === Infinity) continue;
      c.expansions++;
      for (let k = offsets[u]; k < offsets[u + 1]; k++) {
        c.edgeScans++;
        const v = targets[k];
        if (du + weights[k] < dist[v]) {
          dist[v] = du + weights[k];
          prev[v] = u;
          c.relaxations++;
          changed = true;
        }
      }
    }
  }

  // Rodada de verificação: quem ainda melhora está em/depois de um ciclo negativo.
  const queue: number[] = [];
  const affected = new Uint8Array(n);
  if (changed) {
    for (let u = 0; u < n; u++) {
      const du = dist[u];
      if (du === Infinity) continue;
      for (let k = offsets[u]; k < offsets[u + 1]; k++) {
        c.edgeScans++;
        const v = targets[k];
        if (du + weights[k] < dist[v] && !affected[v]) {
          affected[v] = 1;
          queue.push(v);
        }
      }
    }
  }
  const negativeCycle = queue.length > 0;
  for (let h = 0; h < queue.length; h++) {
    const u = queue[h];
    dist[u] = -Infinity;
    for (let k = offsets[u]; k < offsets[u + 1]; k++) {
      const v = targets[k];
      if (!affected[v]) {
        affected[v] = 1;
        queue.push(v);
      }
    }
  }
  c.extra = { rounds, earlyStop: !changed && rounds < n - 1 ? 1 : 0 };
  return { kind: "sssp", negativeCycle, dist, prev, counters: c };
}

/**
 * BFS: fila FIFO. Correto apenas quando todos os arcos têm o mesmo peso c ≥ 0
 * (distância = saltos × c). O(V + E).
 * Expansão = vértice retirado da fila.
 */
export function bfs(g: GraphInstance, source: number): AlgorithmOutput {
  const { n, offsets, targets, weights } = g;
  const unit = weights.length ? weights[0] : 1;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  const c = newCounters();
  let head = 0;
  let tail = 0;
  dist[source] = 0;
  queue[tail++] = source;
  while (head < tail) {
    const u = queue[head++];
    c.expansions++;
    const du = dist[u];
    for (let k = offsets[u]; k < offsets[u + 1]; k++) {
      c.edgeScans++;
      const v = targets[k];
      if (dist[v] === Infinity) {
        dist[v] = du + unit;
        prev[v] = u;
        queue[tail++] = v;
        c.relaxations++;
      }
    }
  }
  c.extra = { enqueues: tail };
  return { kind: "sssp", negativeCycle: false, dist, prev, counters: c };
}

/**
 * Caminhos mínimos em DAG: ordena topologicamente (Kahn) e relaxa os arcos de
 * cada vértice nessa ordem. Aceita pesos negativos (não há ciclos). O(V + E).
 * Expansão = vértice com distância finita processado na ordem topológica.
 */
export function dagShortestPath(g: GraphInstance, source: number): AlgorithmOutput {
  const order = topologicalOrder(g);
  if (!order) throw new Error("O grafo tem ciclo: não é um DAG.");
  const { n, offsets, targets, weights } = g;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const c: Counters = newCounters();
  dist[source] = 0;
  for (let i = 0; i < n; i++) {
    const u = order[i];
    const du = dist[u];
    if (du === Infinity) continue;
    c.expansions++;
    for (let k = offsets[u]; k < offsets[u + 1]; k++) {
      c.edgeScans++;
      const v = targets[k];
      if (du + weights[k] < dist[v]) {
        dist[v] = du + weights[k];
        prev[v] = u;
        c.relaxations++;
      }
    }
  }
  c.extra = { topoSortedVertices: n };
  return { kind: "sssp", negativeCycle: false, dist, prev, counters: c };
}
