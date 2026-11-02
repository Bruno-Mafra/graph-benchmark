import type { GraphInstance } from "../types";
import { MinHeap } from "./minHeap";
import { pathFromPrev } from "./singleSource";
import { newCounters } from "./types";
import type { AlgorithmOutput } from "./types";

/** Fator da heurística euclidiana (pré-calculado em `buildInstance`, fora da medição). */
export function heuristicScale(g: GraphInstance): number {
  return g.heuristicScale;
}

/**
 * A*: prioridade f = g + h, com a heurística euclidiana calibrada
 * (h(v) = c·dist(v, destino), c pré-calculado na instância). Exige pesos ≥ 0.
 * Expansão = vértice retirado da heap com custo definitivo.
 */
export function astar(g: GraphInstance, source: number, target: number): AlgorithmOutput {
  const { n, offsets, targets, weights } = g;
  const scale = g.heuristicScale;
  const pos = g.positions;
  const tx = pos ? pos[2 * target] : 0;
  const ty = pos ? pos[2 * target + 1] : 0;
  const hCache = new Float64Array(n).fill(-1);
  const h = (v: number) => {
    let x = hCache[v];
    if (x < 0) {
      if (pos) {
        const dx = pos[2 * v] - tx;
        const dy = pos[2 * v + 1] - ty;
        x = scale * Math.sqrt(dx * dx + dy * dy);
      } else x = 0;
      hCache[v] = x;
    }
    return x;
  };

  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  const heap = new MinHeap(Math.min(n, 1024));
  const c = newCounters();
  let heapPushes = 1;
  let heapPops = 0;

  dist[source] = 0;
  heap.push(h(source), source);
  while (heap.size > 0) {
    const u = heap.pop();
    heapPops++;
    if (done[u] === 1) continue;
    done[u] = 1;
    c.expansions++;
    if (u === target) break;
    const du = dist[u];
    for (let k = offsets[u]; k < offsets[u + 1]; k++) {
      c.edgeScans++;
      const v = targets[k];
      if (done[v] === 1) continue;
      const nd = du + weights[k];
      if (nd < dist[v]) {
        dist[v] = nd;
        prev[v] = u;
        heap.push(nd + h(v), v);
        heapPushes++;
        c.relaxations++;
      }
    }
  }
  c.extra = { heapPushes, heapPops };
  return {
    kind: "p2p",
    distance: dist[target],
    path: pathFromPrev(prev, dist, source, target),
    counters: c,
    info: { heuristicScale: scale },
  };
}

/**
 * Dijkstra bidirecional: uma busca a partir da origem (arcos de saída) e outra
 * a partir do destino (arcos de entrada), alternando pela heap de menor topo.
 * μ guarda o melhor caminho visto ao examinar um arco que liga as duas buscas;
 * para quando topo_frente + topo_trás ≥ μ. Exige pesos ≥ 0.
 * Expansão = vértice fixado em qualquer uma das duas buscas.
 */
export function bidirectionalDijkstra(g: GraphInstance, source: number, target: number): AlgorithmOutput {
  const c = newCounters();
  if (source === target) {
    c.expansions = 1;
    return { kind: "p2p", distance: 0, path: [source], counters: c };
  }
  const { n } = g;
  const side = [
    { offsets: g.offsets, adj: g.targets, w: g.weights },
    { offsets: g.rOffsets, adj: g.rSources, w: g.rWeights },
  ];
  const dist = [new Float64Array(n).fill(Infinity), new Float64Array(n).fill(Infinity)];
  const prev = [new Int32Array(n).fill(-1), new Int32Array(n).fill(-1)];
  const done = [new Uint8Array(n), new Uint8Array(n)];
  const heaps = [new MinHeap(256), new MinHeap(256)];
  let heapPushes = 2;
  let heapPops = 0;
  dist[0][source] = 0;
  dist[1][target] = 0;
  heaps[0].push(0, source);
  heaps[1].push(0, target);

  let mu = Infinity;
  let meetU = -1; // arco (meetU → meetV) no sentido origem → destino
  let meetV = -1;

  while (heaps[0].size > 0 && heaps[1].size > 0) {
    if (heaps[0].peekKey() + heaps[1].peekKey() >= mu) break;
    const s = heaps[0].peekKey() <= heaps[1].peekKey() ? 0 : 1;
    const o = 1 - s;
    const heap = heaps[s];
    const u = heap.pop();
    heapPops++;
    if (done[s][u] === 1 || heap.poppedKey > dist[s][u]) continue;
    done[s][u] = 1;
    c.expansions++;
    const du = dist[s][u];
    const { offsets, adj, w } = side[s];
    for (let k = offsets[u]; k < offsets[u + 1]; k++) {
      c.edgeScans++;
      const v = adj[k];
      const nd = du + w[k];
      if (nd < dist[s][v]) {
        dist[s][v] = nd;
        prev[s][v] = u;
        heap.push(nd, v);
        heapPushes++;
        c.relaxations++;
      }
      if (dist[o][v] !== Infinity && du + w[k] + dist[o][v] < mu) {
        mu = du + w[k] + dist[o][v];
        if (s === 0) {
          meetU = u;
          meetV = v;
        } else {
          meetU = v;
          meetV = u;
        }
      }
    }
  }
  c.extra = { heapPushes, heapPops };

  let path: number[] | null = null;
  if (mu < Infinity) {
    // origem … meetU pela árvore da frente; meetV … destino pela árvore de trás.
    path = [];
    for (let v = meetU; v !== -1; v = prev[0][v]) path.push(v);
    path.reverse();
    for (let v = meetV; v !== -1; v = prev[1][v]) path.push(v);
  }
  return { kind: "p2p", distance: mu, path, counters: c };
}
