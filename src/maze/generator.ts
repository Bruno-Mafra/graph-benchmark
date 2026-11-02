import type { MazeGrid } from "./model";

export { createRng, randomIntInclusive } from "../utils/random";

export type MazeGenerationOptions = {
  rng?: () => number;
  /**
   * Fração de paredes internas removidas após gerar o labirinto perfeito.
   * Cria ciclos (rotas alternativas), tornando o caminho mínimo não trivial.
   */
  braid?: number;
};

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * Gera um labirinto N×N:
 * 1. "Recursive backtracker" (DFS iterativa) em células de coordenadas pares,
 *    produzindo corredores e bifurcações com todas as células conectadas;
 * 2. remove uma fração das paredes entre corredores (ciclos);
 * 3. início em (0,0) e destino na célula alcançável mais distante (BFS),
 *    garantindo que exista caminho e que ele não seja trivial.
 */
export function generateMaze(size: number, options: MazeGenerationOptions = {}): MazeGrid {
  const rng = options.rng ?? Math.random;
  const braid = options.braid ?? 0.08;
  const total = size * size;
  const walls = new Uint8Array(total).fill(1);

  // Células "sala" ficam em coordenadas pares; as ímpares entre elas são paredes candidatas.
  walls[0] = 0;
  const stack = new Int32Array(total);
  let top = 0;
  stack[top++] = 0;
  const order = [0, 1, 2, 3];

  while (top > 0) {
    const cur = stack[top - 1];
    const r = Math.floor(cur / size);
    const c = cur % size;

    // Embaralha as direções (Fisher-Yates).
    for (let i = 3; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }

    let advanced = false;
    for (const d of order) {
      const nr = r + DIRS[d][0] * 2;
      const nc = c + DIRS[d][1] * 2;
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
      const next = nr * size + nc;
      if (walls[next] === 0) continue;
      walls[(r + DIRS[d][0]) * size + (c + DIRS[d][1])] = 0;
      walls[next] = 0;
      stack[top++] = next;
      advanced = true;
      break;
    }
    if (!advanced) top--;
  }

  // N par: a última linha/coluna fica fora da malha de salas; abre alguns becos.
  if (size % 2 === 0) {
    const last = size - 1;
    for (let k = 0; k < size; k += 2) {
      if (rng() < 0.5) walls[last * size + k] = 0;
      if (rng() < 0.5) walls[k * size + last] = 0;
    }
  }

  // Braiding: remove paredes que separam dois corredores.
  if (braid > 0) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const i = r * size + c;
        if (walls[i] === 0) continue;
        const horizontal =
          c > 0 && c < size - 1 && walls[i - 1] === 0 && walls[i + 1] === 0;
        const vertical =
          r > 0 && r < size - 1 && walls[i - size] === 0 && walls[i + size] === 0;
        if ((horizontal || vertical) && rng() < braid) walls[i] = 0;
      }
    }
  }

  const start = 0;
  const goal = farthestReachable(walls, size, start);
  return { size, walls, costs: null, start, goal };
}

/** Célula alcançável mais distante (em passos) de `from`, via BFS. */
function farthestReachable(walls: Uint8Array, size: number, from: number): number {
  const total = size * size;
  const dist = new Int32Array(total).fill(-1);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  queue[tail++] = from;
  dist[from] = 0;
  let best = from;

  while (head < tail) {
    const u = queue[head++];
    if (dist[u] > dist[best]) best = u;
    const r = Math.floor(u / size);
    const c = u % size;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
      const v = nr * size + nc;
      if (walls[v] === 1 || dist[v] !== -1) continue;
      dist[v] = dist[u] + 1;
      queue[tail++] = v;
    }
  }
  return best;
}
