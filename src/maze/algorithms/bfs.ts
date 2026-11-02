import type { MazeGrid } from "../model";
import type { MazeSearchOutput } from "./types";
import { openNeighbors, reconstructPath, searchOutput } from "./gridUtils";

/**
 * BFS: fila FIFO, expande em ordem de número de movimentos.
 * Mínimo garantido apenas quando todo movimento custa o mesmo (grid sem pesos).
 * Complexidade: O(V + E).
 */
export function bfsGrid(grid: MazeGrid): MazeSearchOutput {
  const total = grid.size * grid.size;
  const start = grid.start!;
  const goal = grid.goal!;
  const prev = new Int32Array(total).fill(-1);
  const seen = new Uint8Array(total);
  const explored = new Uint8Array(total);
  const queue = new Int32Array(total);
  const nb = new Int32Array(4);
  let head = 0;
  let tail = 0;
  let nodeExpansions = 0;
  let enqueues = 1;

  queue[tail++] = start;
  seen[start] = 1;
  let found = false;
  while (head < tail) {
    const u = queue[head++];
    explored[u] = 1;
    nodeExpansions++;
    if (u === goal) {
      found = true;
      break;
    }
    const n = openNeighbors(grid, u, nb);
    for (let k = 0; k < n; k++) {
      const v = nb[k];
      if (seen[v]) continue;
      seen[v] = 1;
      prev[v] = u;
      queue[tail++] = v;
      enqueues++;
    }
  }

  return searchOutput(grid, found ? reconstructPath(prev, goal) : null, explored, nodeExpansions, {
    enqueues,
  });
}

/**
 * BFS bidirecional: duas frentes (início e destino) avançam uma camada completa
 * por vez, sempre a frente menor. Ao completar uma camada em que as frentes se
 * tocaram, o melhor ponto de encontro dá o caminho mínimo (grid sem pesos).
 * Expansões = células retiradas das DUAS filas.
 */
export function bidirectionalBfsGrid(grid: MazeGrid): MazeSearchOutput {
  const total = grid.size * grid.size;
  const start = grid.start!;
  const goal = grid.goal!;
  const dist = [new Int32Array(total).fill(-1), new Int32Array(total).fill(-1)];
  const prev = [new Int32Array(total).fill(-1), new Int32Array(total).fill(-1)];
  const queue = [new Int32Array(total), new Int32Array(total)];
  const head = [0, 0];
  const tail = [1, 1];
  const explored = new Uint8Array(total);
  const nb = new Int32Array(4);
  let nodeExpansions = 0;
  let enqueues = 2;

  queue[0][0] = start;
  queue[1][0] = goal;
  dist[0][start] = 0;
  dist[1][goal] = 0;

  let meet = -1;
  let best = Infinity;
  while (head[0] < tail[0] && head[1] < tail[1]) {
    const side = tail[0] - head[0] <= tail[1] - head[1] ? 0 : 1;
    const other = 1 - side;
    const levelEnd = tail[side];
    while (head[side] < levelEnd) {
      const u = queue[side][head[side]++];
      explored[u] = 1;
      nodeExpansions++;
      const n = openNeighbors(grid, u, nb);
      for (let k = 0; k < n; k++) {
        const v = nb[k];
        if (dist[side][v] !== -1) continue;
        dist[side][v] = dist[side][u] + 1;
        prev[side][v] = u;
        queue[side][tail[side]++] = v;
        enqueues++;
        if (dist[other][v] !== -1) {
          const d = dist[side][v] + dist[other][v];
          if (d < best) {
            best = d;
            meet = v;
          }
        }
      }
    }
    if (meet !== -1) break;
  }

  let path: number[] | null = null;
  if (meet !== -1) {
    // Início → encontro pela árvore da frente 0; encontro → destino pela frente 1.
    path = reconstructPath(prev[0], meet);
    for (let v = prev[1][meet]; v !== -1; v = prev[1][v]) path.push(v);
  }
  return searchOutput(grid, path, explored, nodeExpansions, { enqueues });
}
