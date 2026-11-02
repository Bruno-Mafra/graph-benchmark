/**
 * Modelo de dados do labirinto (independente de React).
 *
 * Células são endereçadas por índice linear: `index = row * size + col`.
 * Cada célula transitável é um vértice; arestas ligam vizinhos ortogonais.
 */
export type MazeGrid = {
  size: number;
  /** 1 = obstáculo, 0 = transitável. */
  walls: Uint8Array;
  /**
   * Custo para ENTRAR em cada célula. `null` = custo uniforme 1.
   * Ainda não editável pela interface, mas os algoritmos já o respeitam.
   */
  costs: Float64Array | null;
  start: number | null;
  goal: number | null;
};

export type MazeEditMode = "wall" | "erase" | "start" | "goal";

export function cellIndex(size: number, row: number, col: number): number {
  return row * size + col;
}

export function cellRow(size: number, index: number): number {
  return Math.floor(index / size);
}

export function cellCol(size: number, index: number): number {
  return index % size;
}

/** Custo da aresta que entra em `to` (pesos futuros). */
export function moveCost(grid: MazeGrid, to: number): number {
  return grid.costs ? grid.costs[to] : 1;
}

/** Grid vazio com início no canto superior esquerdo e destino no inferior direito. */
export function createEmptyMaze(size: number): MazeGrid {
  return {
    size,
    walls: new Uint8Array(size * size),
    costs: null,
    start: 0,
    goal: size * size - 1,
  };
}

export function countWalls(grid: MazeGrid): number {
  let n = 0;
  for (let i = 0; i < grid.walls.length; i++) n += grid.walls[i];
  return n;
}

/**
 * Aplica uma edição de célula mantendo o estado consistente:
 * - obstáculo nunca fica sobre início/destino;
 * - início e destino nunca coincidem;
 * - mover início/destino para um obstáculo remove o obstáculo.
 *
 * Retorna o MESMO objeto quando nada muda (permite evitar re-render e
 * evitar descartar resultados à toa).
 */
export function applyCellEdit(grid: MazeGrid, mode: MazeEditMode, index: number): MazeGrid {
  if (index < 0 || index >= grid.walls.length) return grid;

  switch (mode) {
    case "wall": {
      if (index === grid.start || index === grid.goal) return grid;
      if (grid.walls[index] === 1) return grid;
      const walls = grid.walls.slice();
      walls[index] = 1;
      return { ...grid, walls };
    }
    case "erase": {
      if (grid.walls[index] === 0) return grid;
      const walls = grid.walls.slice();
      walls[index] = 0;
      return { ...grid, walls };
    }
    case "start":
    case "goal": {
      const key = mode;
      const other = mode === "start" ? grid.goal : grid.start;
      if (index === other || index === grid[key]) return grid;
      let walls = grid.walls;
      if (walls[index] === 1) {
        walls = walls.slice();
        walls[index] = 0;
      }
      return { ...grid, walls, [key]: index };
    }
  }
}

export function clearWalls(grid: MazeGrid): MazeGrid {
  return { ...grid, walls: new Uint8Array(grid.walls.length) };
}

/**
 * Mensagem orientando o usuário se início/destino estiverem inválidos;
 * `null` quando o labirinto pode ser resolvido.
 */
export function validateEndpoints(grid: MazeGrid): string | null {
  const total = grid.size * grid.size;
  if (grid.start == null) return "Defina o ponto de início antes de executar.";
  if (grid.goal == null) return "Defina o ponto de destino antes de executar.";
  if (grid.start < 0 || grid.start >= total) return "O início está fora do grid.";
  if (grid.goal < 0 || grid.goal >= total) return "O destino está fora do grid.";
  if (grid.start === grid.goal) return "Início e destino precisam ser células diferentes.";
  if (grid.walls[grid.start] === 1) return "O início está sobre um obstáculo.";
  if (grid.walls[grid.goal] === 1) return "O destino está sobre um obstáculo.";
  return null;
}
