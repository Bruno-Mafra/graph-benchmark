import { describe, expect, it } from "vitest";
import { dijkstraGrid } from "./algorithms/dijkstraGrid";
import { solveMaze } from "./algorithms/registry";
import { createRng, generateMaze } from "./generator";
import {
  applyCellEdit,
  cellCol,
  cellIndex,
  cellRow,
  createEmptyMaze,
  validateEndpoints,
} from "./model";
import type { MazeGrid } from "./model";
import { initMazeState, mazeReducer } from "./mazeState";
import { MAZE_LIMITS } from "./config";

/** Monta um grid a partir de linhas: '#' obstáculo, 'S' início, 'G' destino, '.' livre. */
function parseGrid(rows: string[]): MazeGrid {
  const size = rows.length;
  const grid = createEmptyMaze(size);
  grid.start = null;
  grid.goal = null;
  rows.forEach((line, r) => {
    expect(line.length).toBe(size);
    [...line].forEach((ch, c) => {
      const i = cellIndex(size, r, c);
      if (ch === "#") grid.walls[i] = 1;
      if (ch === "S") grid.start = i;
      if (ch === "G") grid.goal = i;
    });
  });
  return grid;
}

/** BFS independente para conferir a distância mínima. */
function bfsDistance(grid: MazeGrid): number | null {
  const { size, walls } = grid;
  const dist = new Map<number, number>([[grid.start!, 0]]);
  const queue = [grid.start!];
  while (queue.length) {
    const u = queue.shift()!;
    if (u === grid.goal) return dist.get(u)!;
    const r = cellRow(size, u);
    const c = cellCol(size, u);
    for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
      const v = cellIndex(size, nr, nc);
      if (walls[v] || dist.has(v)) continue;
      dist.set(v, dist.get(u)! + 1);
      queue.push(v);
    }
  }
  return null;
}

function expectValidPath(grid: MazeGrid, path: number[]) {
  expect(path[0]).toBe(grid.start);
  expect(path[path.length - 1]).toBe(grid.goal);
  for (const i of path) expect(grid.walls[i]).toBe(0);
  for (let k = 1; k < path.length; k++) {
    const dr = Math.abs(cellRow(grid.size, path[k]) - cellRow(grid.size, path[k - 1]));
    const dc = Math.abs(cellCol(grid.size, path[k]) - cellCol(grid.size, path[k - 1]));
    // Exatamente um passo ortogonal (sem diagonais, sem saltos).
    expect(dr + dc).toBe(1);
  }
}

describe("dijkstraGrid", () => {
  it("encontra o caminho mínimo em um grid simples", () => {
    const grid = parseGrid([
      "S....",
      ".....",
      ".....",
      ".....",
      "....G",
    ]);
    const out = dijkstraGrid(grid);
    expect(out.found).toBe(true);
    expect(out.pathCost).toBe(8);
    expect(out.path).toHaveLength(9);
    expectValidPath(grid, out.path);
  });

  it("contorna obstáculos pelo caminho mais curto", () => {
    const grid = parseGrid([
      "S.#..",
      ".##.#",
      "...#.",
      "##...",
      "G.#..",
    ]);
    // A única rota desce pela coluna 0 até (2,*), não há passagem para G pela direita.
    const out = dijkstraGrid(grid);
    expect(out.found).toBe(false);

    const open = parseGrid([
      "S.#..",
      ".##..",
      "....#",
      "##.#.",
      "G....",
    ]);
    const res = dijkstraGrid(open);
    expect(res.found).toBe(true);
    expect(res.pathCost).toBe(bfsDistance(open));
    expectValidPath(open, res.path);
  });

  it("não usa diagonais", () => {
    // Em diagonal seriam 2 passos; ortogonalmente o atalho é bloqueado.
    const grid = parseGrid([
      "S#...",
      "#G...",
      ".....",
      ".....",
      ".....",
    ]);
    expect(dijkstraGrid(grid).found).toBe(false);
  });

  it("informa ausência de caminho sem devolver caminho inválido", () => {
    const grid = parseGrid([
      "S.#..",
      "..#..",
      "###..",
      ".....",
      "....G",
    ]);
    const out = dijkstraGrid(grid);
    expect(out.found).toBe(false);
    expect(out.path).toEqual([]);
    expect(out.pathCost).toBeNull();
  });

  it("respeita custos por célula quando presentes", () => {
    const grid = parseGrid([
      "S....",
      ".....",
      ".....",
      ".....",
      "....G",
    ]);
    grid.costs = new Float64Array(25).fill(1);
    // Encarece a linha 0 depois do início: a rota ótima deve evitá-la.
    for (let c = 1; c < 5; c++) grid.costs[c] = 10;
    const out = dijkstraGrid(grid);
    expect(out.pathCost).toBe(8);
    expect(out.path.some((i) => i > 0 && i < 5)).toBe(false);
  });

  it("separa células exploradas do caminho e o caminho está contido nas exploradas", () => {
    const grid = createEmptyMaze(10);
    const out = dijkstraGrid(grid);
    for (const i of out.path) expect(out.explored[i]).toBe(1);
    const exploredCount = out.explored.reduce((a, b) => a + b, 0);
    expect(exploredCount).toBe(out.nodeExpansions);
    expect(out.nodeExpansions).toBeGreaterThanOrEqual(out.path.length);
  });
});

describe("solveMaze", () => {
  it("usa convenções consistentes: custo = passos, células = custo + 1", () => {
    const grid = createEmptyMaze(7);
    const outcome = solveMaze(grid, "dijkstra");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const r = outcome.result;
    expect(r.status).toBe("found");
    expect(r.pathCost).toBe(12);
    expect(r.pathCells).toBe(13);
    expect(r.pathCells).toBe(r.path.length);
    expect(r.timeMs).toBeGreaterThanOrEqual(0);
    expect(r.timedRuns).toBeGreaterThanOrEqual(1);
  });

  it("retorna status no-path quando não há caminho", () => {
    const grid = createEmptyMaze(5);
    for (let c = 0; c < 5; c++) grid.walls[cellIndex(5, 2, c)] = 1;
    const outcome = solveMaze(grid, "dijkstra");
    expect(outcome.ok && outcome.result.status).toBe("no-path");
    expect(outcome.ok && outcome.result.pathCells).toBe(0);
  });

  it("orienta quando início ou destino estão inválidos", () => {
    const noStart = { ...createEmptyMaze(5), start: null };
    const r1 = solveMaze(noStart, "dijkstra");
    expect(r1.ok).toBe(false);
    expect(!r1.ok && r1.error).toMatch(/início/);

    const same = { ...createEmptyMaze(5), goal: 0 };
    expect(validateEndpoints(same)).toMatch(/diferentes/);

    const onWall = createEmptyMaze(5);
    onWall.walls[24] = 1;
    expect(validateEndpoints(onWall)).toMatch(/destino/);
  });
});

describe("generateMaze", () => {
  it("gera grids válidos e solucionáveis para vários tamanhos e sementes", () => {
    for (const size of [5, 6, 21, 50, 81]) {
      for (let seed = 1; seed <= 5; seed++) {
        const grid = generateMaze(size, { rng: createRng(seed * 7919 + size) });
        expect(grid.walls).toHaveLength(size * size);
        expect(validateEndpoints(grid)).toBeNull();
        expect(grid.start).not.toBe(grid.goal);
        const d = bfsDistance(grid);
        expect(d).not.toBeNull();
        // Não trivial: destino é o ponto mais distante, bem além da vizinhança.
        expect(d!).toBeGreaterThanOrEqual(size - 1);
        const outcome = solveMaze(grid, "dijkstra");
        expect(outcome.ok && outcome.result.pathCost).toBe(d);
      }
    }
  });

  it("produz obstáculos (não é um grid vazio) e é determinístico com semente", () => {
    const a = generateMaze(31, { rng: createRng(42) });
    const b = generateMaze(31, { rng: createRng(42) });
    expect(a.walls).toEqual(b.walls);
    const wallCount = a.walls.reduce((x, y) => x + y, 0);
    expect(wallCount / a.walls.length).toBeGreaterThan(0.2);
    expect(wallCount / a.walls.length).toBeLessThan(0.6);
  });

  it("gera e resolve o maior grid permitido sem travar", () => {
    const size = MAZE_LIMITS.maxSize;
    const t0 = performance.now();
    const grid = generateMaze(size, { rng: createRng(3) });
    const outcome = solveMaze(grid, "dijkstra");
    const elapsed = performance.now() - t0;
    expect(outcome.ok && outcome.result.status).toBe("found");
    expect(elapsed).toBeLessThan(5000);
  });
});

describe("edição manual", () => {
  it("não permite obstáculo sobre início ou destino", () => {
    const g = createEmptyMaze(5);
    expect(applyCellEdit(g, "wall", g.start!)).toBe(g);
    expect(applyCellEdit(g, "wall", g.goal!)).toBe(g);
  });

  it("não permite início e destino na mesma célula", () => {
    const g = createEmptyMaze(5);
    expect(applyCellEdit(g, "start", g.goal!)).toBe(g);
    expect(applyCellEdit(g, "goal", g.start!)).toBe(g);
  });

  it("mover início/destino para um obstáculo remove o obstáculo", () => {
    let g = createEmptyMaze(5);
    g = applyCellEdit(g, "wall", 12);
    expect(g.walls[12]).toBe(1);
    g = applyCellEdit(g, "start", 12);
    expect(g.start).toBe(12);
    expect(g.walls[12]).toBe(0);
    g = applyCellEdit(g, "wall", 7);
    g = applyCellEdit(g, "goal", 7);
    expect(g.goal).toBe(7);
    expect(g.walls[7]).toBe(0);
    expect(validateEndpoints(g)).toBeNull();
  });

  it("não modifica o grid original (imutável)", () => {
    const g = createEmptyMaze(5);
    const g2 = applyCellEdit(g, "wall", 3);
    expect(g.walls[3]).toBe(0);
    expect(g2.walls[3]).toBe(1);
  });
});

describe("mazeReducer", () => {
  function withResult() {
    const state = initMazeState(6);
    const outcome = solveMaze(state.grid, "dijkstra");
    if (!outcome.ok) throw new Error(outcome.error);
    return mazeReducer(state, { type: "setResults", results: [outcome.result] });
  }

  it("limpa resultados quando o labirinto muda", () => {
    const s = withResult();
    expect(s.results).toHaveLength(1);
    expect(mazeReducer(s, { type: "editCell", mode: "wall", index: 3 }).results).toEqual([]);
    expect(mazeReducer(s, { type: "clearWalls" }).results).toEqual([]);
    expect(mazeReducer(s, { type: "reset", size: 6 }).results).toEqual([]);
    expect(
      mazeReducer(s, { type: "load", grid: generateMaze(9, { rng: createRng(1) }) }).results
    ).toEqual([]);
    expect(mazeReducer(s, { type: "clearResults" }).results).toEqual([]);
  });

  it("mantém resultados quando uma edição é rejeitada", () => {
    const s = withResult();
    const next = mazeReducer(s, { type: "editCell", mode: "wall", index: s.grid.start! });
    expect(next).toBe(s);
  });

  it("nova execução substitui o resultado anterior sem alterar o grid", () => {
    const s = withResult();
    const outcome = solveMaze(s.grid, "dijkstra");
    if (!outcome.ok) throw new Error(outcome.error);
    const next = mazeReducer(s, { type: "setResults", results: [outcome.result] });
    expect(next.grid).toBe(s.grid);
    expect(next.results).toHaveLength(1);
    expect(next.results[0]).not.toBe(s.results[0]);
  });
});
