import { Heap } from "heap-js";
import { moveCost } from "../model";
import type { MazeGrid } from "../model";
import type { MazeSearchOutput } from "./types";
import { manhattan, minStepCost, openNeighbors, reconstructPath, searchOutput } from "./gridUtils";

/** [prioridade, h (desempate), g, célula] */
type Entry = [number, number, number, number];

/**
 * A*: prioridade f = g + h, com h = Manhattan × menor custo de movimento.
 * Essa h nunca superestima e é consistente (cada passo reduz Manhattan em no
 * máximo 1 e custa ≥ menor custo), então o caminho é mínimo também com pesos
 * positivos. Empates são resolvidos pelo menor h (vai mais fundo na direção do destino).
 * Expansões = células retiradas da heap e processadas.
 */
export function astarGrid(grid: MazeGrid): MazeSearchOutput {
  const total = grid.size * grid.size;
  const start = grid.start!;
  const goal = grid.goal!;
  const scale = minStepCost(grid);
  const h = (v: number) => manhattan(grid.size, v, goal) * scale;

  const g = new Float64Array(total).fill(Infinity);
  const prev = new Int32Array(total).fill(-1);
  const explored = new Uint8Array(total);
  const nb = new Int32Array(4);
  const heap = new Heap<Entry>((a, b) => a[0] - b[0] || a[1] - b[1]);
  let nodeExpansions = 0;
  let relaxations = 0;
  let heapPushes = 1;
  let heapPops = 0;

  g[start] = 0;
  heap.push([h(start), h(start), 0, start]);
  let found = false;
  while (heap.size() > 0) {
    const [, , gu, u] = heap.pop()!;
    heapPops++;
    if (explored[u] === 1 || gu > g[u]) continue;
    explored[u] = 1;
    nodeExpansions++;
    if (u === goal) {
      found = true;
      break;
    }
    const n = openNeighbors(grid, u, nb);
    for (let k = 0; k < n; k++) {
      const v = nb[k];
      if (explored[v] === 1) continue;
      const ng = gu + moveCost(grid, v);
      if (ng < g[v]) {
        g[v] = ng;
        prev[v] = u;
        const hv = h(v);
        heap.push([ng + hv, hv, ng, v]);
        heapPushes++;
        relaxations++;
      }
    }
  }

  return searchOutput(grid, found ? reconstructPath(prev, goal) : null, explored, nodeExpansions, {
    relaxations,
    heapPushes,
    heapPops,
  });
}

/**
 * Greedy Best-First: prioridade = apenas h (Manhattan). Cada célula entra na
 * heap uma vez (na primeira descoberta) e o predecessor nunca é corrigido,
 * por isso o caminho pode não ser mínimo.
 * Expansões = células retiradas da heap e processadas.
 */
export function greedyGrid(grid: MazeGrid): MazeSearchOutput {
  const total = grid.size * grid.size;
  const start = grid.start!;
  const goal = grid.goal!;
  const h = (v: number) => manhattan(grid.size, v, goal);

  const prev = new Int32Array(total).fill(-1);
  const discovered = new Uint8Array(total);
  const explored = new Uint8Array(total);
  const nb = new Int32Array(4);
  const heap = new Heap<Entry>((a, b) => a[0] - b[0]);
  let nodeExpansions = 0;
  let heapPushes = 1;
  let heapPops = 0;

  discovered[start] = 1;
  heap.push([h(start), 0, 0, start]);
  let found = false;
  while (heap.size() > 0) {
    const u = heap.pop()![3];
    heapPops++;
    explored[u] = 1;
    nodeExpansions++;
    if (u === goal) {
      found = true;
      break;
    }
    const n = openNeighbors(grid, u, nb);
    for (let k = 0; k < n; k++) {
      const v = nb[k];
      if (discovered[v]) continue;
      discovered[v] = 1;
      prev[v] = u;
      heap.push([h(v), 0, 0, v]);
      heapPushes++;
    }
  }

  return searchOutput(grid, found ? reconstructPath(prev, goal) : null, explored, nodeExpansions, {
    heapPushes,
    heapPops,
  });
}
