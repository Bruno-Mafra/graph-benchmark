import { Heap } from "heap-js";
import type { Graph } from "./types";

/**
 * Dijkstra
 * Complexidade: O(E log V)
 */
export function dijkstra(graph: Graph, source: number) {
  const n = graph.length;
  const dist = new Array<number>(n).fill(Infinity);

  dist[source] = 0;

  const heap = new Heap<[number, number]>((a, b) => a[0] - b[0]);
  heap.push([0, source]);

  while (heap.size() > 0) {
    const [d, u] = heap.pop()!;

    if (d > dist[u]) continue;

    for (const { to: v, weight: w } of graph[u]) {
      const nd = d + w;
      if (nd < dist[v]) {
        dist[v] = nd;
        heap.push([nd, v]);
      }
    }
  }

  return dist;
}

export type DijkstraMetrics = {
  relaxations: number;
  heapPushes: number;
  maxHeapSize: number;
  avgHeapSize: number;
  heapExtractions: number;
};

/**
 * Mesmo algoritmo, com contadores para benchmark / análise.
 */
export function dijkstraWithMetrics(
  graph: Graph,
  source: number
): { dist: number[]; metrics: DijkstraMetrics } {
  const n = graph.length;
  const dist = new Array<number>(n).fill(Infinity);
  dist[source] = 0;

  let relaxations = 0;
  let heapPushes = 0;
  let maxHeapSize = 0;
  let heapSizeSum = 0;
  let heapSamples = 0;
  let heapExtractions = 0;

  const heap = new Heap<[number, number]>((a, b) => a[0] - b[0]);
  heap.push([0, source]);
  heapPushes++;
  heapSizeSum += heap.size();
  heapSamples++;
  maxHeapSize = Math.max(maxHeapSize, heap.size());

  while (heap.size() > 0) {
    const [d, u] = heap.pop()!;
    heapExtractions++;
    if (d > dist[u]) continue;

    for (const { to: v, weight: w } of graph[u]) {
      const nd = d + w;
      if (nd < dist[v]) {
        dist[v] = nd;
        heap.push([nd, v]);
        heapPushes++;
        relaxations++;
        const sz = heap.size();
        heapSizeSum += sz;
        heapSamples++;
        maxHeapSize = Math.max(maxHeapSize, sz);
      }
    }
  }

  const avgHeapSize = heapSamples > 0 ? heapSizeSum / heapSamples : 0;

  return {
    dist,
    metrics: {
      relaxations,
      heapPushes,
      maxHeapSize,
      avgHeapSize,
      heapExtractions,
    },
  };
}