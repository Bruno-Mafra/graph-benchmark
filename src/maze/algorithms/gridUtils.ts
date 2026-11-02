import { moveCost } from "../model";
import type { MazeGrid } from "../model";

/**
 * Escreve em `out` os vizinhos ortogonais transitáveis de `u` (cima, baixo,
 * esquerda, direita) e devolve quantos são. Sem diagonais.
 */
export function openNeighbors(grid: MazeGrid, u: number, out: Int32Array): number {
  const { size, walls } = grid;
  const r = Math.floor(u / size);
  const c = u - r * size;
  let n = 0;
  if (r > 0 && walls[u - size] === 0) out[n++] = u - size;
  if (r < size - 1 && walls[u + size] === 0) out[n++] = u + size;
  if (c > 0 && walls[u - 1] === 0) out[n++] = u - 1;
  if (c < size - 1 && walls[u + 1] === 0) out[n++] = u + 1;
  return n;
}

export function manhattan(size: number, a: number, b: number): number {
  const ar = Math.floor(a / size);
  const br = Math.floor(b / size);
  return Math.abs(ar - br) + Math.abs(a - ar * size - (b - br * size));
}

/**
 * Menor custo possível de um movimento. Multiplicar a distância Manhattan por
 * ele mantém a heurística admissível e consistente com pesos positivos.
 */
export function minStepCost(grid: MazeGrid): number {
  if (!grid.costs) return 1;
  let min = Infinity;
  for (let i = 0; i < grid.costs.length; i++) {
    if (grid.walls[i] === 0 && grid.costs[i] < min) min = grid.costs[i];
  }
  return Number.isFinite(min) ? min : 1;
}

/** Custo de percorrer `path` (soma dos custos de entrada, sem contar o início). */
export function pathCostOf(grid: MazeGrid, path: number[]): number {
  let cost = 0;
  for (let k = 1; k < path.length; k++) cost += moveCost(grid, path[k]);
  return cost;
}

/** Reconstrói o caminho seguindo `prev` a partir de `goal` (-1 = sem predecessor). */
export function reconstructPath(prev: Int32Array, goal: number): number[] {
  const path: number[] = [];
  for (let v = goal; v !== -1; v = prev[v]) path.push(v);
  return path.reverse();
}

/** Monta a saída padrão de uma busca, com custo calculado pelo modelo do grid. */
export function searchOutput(
  grid: MazeGrid,
  path: number[] | null,
  explored: Uint8Array,
  nodeExpansions: number,
  operations: Record<string, number>
) {
  const found = path != null && path.length > 0;
  return {
    found,
    path: found ? path : [],
    pathCost: found ? pathCostOf(grid, path) : null,
    explored,
    nodeExpansions,
    operations,
  };
}
