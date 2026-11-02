import { Heap } from "heap-js";
import { moveCost } from "../model";
import type { MazeGrid } from "../model";
import type { MazeSearchOutput } from "./types";

/**
 * Dijkstra sobre o grid implícito (sem montar lista de adjacência):
 * vizinhos ortogonais transitáveis, custo da aresta = custo de entrar na célula.
 * Para assim que o destino é removido da heap (distância definitiva).
 * Complexidade: O(V log V) em grid (E ≤ 4V).
 */
export function dijkstraGrid(grid: MazeGrid): MazeSearchOutput {
  const { size, walls } = grid;
  const start = grid.start!;
  const goal = grid.goal!;
  const total = size * size;

  const dist = new Float64Array(total).fill(Infinity);
  const prev = new Int32Array(total).fill(-1);
  const explored = new Uint8Array(total);

  let nodeExpansions = 0;
  let relaxations = 0;
  let heapPushes = 0;
  let heapPops = 0;

  const heap = new Heap<[number, number]>((a, b) => a[0] - b[0]);
  dist[start] = 0;
  heap.push([0, start]);
  heapPushes++;

  let found = false;
  while (heap.size() > 0) {
    const [d, u] = heap.pop()!;
    heapPops++;
    if (explored[u] === 1 || d > dist[u]) continue;
    explored[u] = 1;
    nodeExpansions++;
    if (u === goal) {
      found = true;
      break;
    }

    const r = Math.floor(u / size);
    const c = u - r * size;
    for (let k = 0; k < 4; k++) {
      let v: number;
      if (k === 0) {
        if (r === 0) continue;
        v = u - size;
      } else if (k === 1) {
        if (r === size - 1) continue;
        v = u + size;
      } else if (k === 2) {
        if (c === 0) continue;
        v = u - 1;
      } else {
        if (c === size - 1) continue;
        v = u + 1;
      }
      if (walls[v] === 1 || explored[v] === 1) continue;
      const nd = d + moveCost(grid, v);
      if (nd < dist[v]) {
        dist[v] = nd;
        prev[v] = u;
        heap.push([nd, v]);
        heapPushes++;
        relaxations++;
      }
    }
  }

  const path: number[] = [];
  if (found) {
    for (let v = goal; v !== -1; v = prev[v]) path.push(v);
    path.reverse();
  }

  return {
    found,
    path,
    pathCost: found ? dist[goal] : null,
    explored,
    nodeExpansions,
    operations: { relaxations, heapPushes, heapPops },
  };
}
