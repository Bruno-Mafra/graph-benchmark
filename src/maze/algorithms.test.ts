import { describe, expect, it } from "vitest";
import { MAZE_ALGORITHMS, MAZE_ALGORITHM_IDS, solveMaze } from "./algorithms/registry";
import type { MazeAlgorithmId, MazeSearchOutput } from "./algorithms/types";
import { bfsGrid, bidirectionalBfsGrid } from "./algorithms/bfs";
import { astarGrid, greedyGrid } from "./algorithms/bestFirst";
import { dijkstraGrid } from "./algorithms/dijkstraGrid";
import { acoGrid } from "./algorithms/aco";
import { gaGrid } from "./algorithms/ga";
import { ACO_PARAMS, GA_PARAMS, defaultParams, validateParams } from "./algorithms/params";
import { aggregateRuns, computeGap, numberStats, optimalityVerdict, referenceOptimalCost } from "./algorithms/stats";
import { buildJobs, runJobsSync } from "./runner";
import type { RunnerEvent } from "./runner";
import { createRng, generateMaze } from "./generator";
import { cellCol, cellIndex, cellRow, createEmptyMaze } from "./model";
import type { MazeGrid } from "./model";
import { initMazeState, mazeReducer } from "./mazeState";
import { MAZE_LIMITS } from "./config";

function parseGrid(rows: string[]): MazeGrid {
  const size = rows.length;
  const grid = createEmptyMaze(size);
  grid.start = null;
  grid.goal = null;
  rows.forEach((line, r) =>
    [...line].forEach((ch, c) => {
      const i = cellIndex(size, r, c);
      if (ch === "#") grid.walls[i] = 1;
      if (ch === "S") grid.start = i;
      if (ch === "G") grid.goal = i;
    })
  );
  return grid;
}

function expectValidPath(grid: MazeGrid, out: MazeSearchOutput) {
  const { path } = out;
  expect(out.found).toBe(true);
  expect(path[0]).toBe(grid.start);
  expect(path[path.length - 1]).toBe(grid.goal);
  for (const i of path) expect(grid.walls[i]).toBe(0);
  for (let k = 1; k < path.length; k++) {
    const dr = Math.abs(cellRow(grid.size, path[k]) - cellRow(grid.size, path[k - 1]));
    const dc = Math.abs(cellCol(grid.size, path[k]) - cellCol(grid.size, path[k - 1]));
    expect(dr + dc).toBe(1);
  }
  // Custo uniforme: custo = movimentos = células − 1.
  if (!grid.costs) expect(out.pathCost).toBe(path.length - 1);
}

const ctx = (id: MazeAlgorithmId, seed = 7) => ({
  rng: createRng(seed),
  params: defaultParams(MAZE_ALGORITHMS[id].params),
});

/** Grid com muitas rotas possíveis (aberto, com alguns obstáculos). */
function openGridWithObstacles(size: number, seed: number): MazeGrid {
  const rng = createRng(seed);
  const g = createEmptyMaze(size);
  for (let i = 0; i < g.walls.length; i++) if (rng() < 0.22) g.walls[i] = 1;
  g.walls[g.start!] = 0;
  g.walls[g.goal!] = 0;
  return g;
}

const mazes: MazeGrid[] = [
  ...[1, 2, 3, 4].map((s) => generateMaze(21 + s * 6, { rng: createRng(s) })),
  ...[5, 6, 7].map((s) => openGridWithObstacles(30, s)),
].filter((g) => dijkstraGrid(g).found);

describe("algoritmos exatos", () => {
  it.each(mazes.map((g, i) => [i, g] as const))("BFS, BFS bidirecional e A* igualam Dijkstra (grid %i)", (_, grid) => {
    const ref = dijkstraGrid(grid).pathCost;
    for (const fn of [bfsGrid, bidirectionalBfsGrid, astarGrid]) {
      const out = fn(grid);
      expectValidPath(grid, out);
      expect(out.pathCost).toBe(ref);
    }
  });

  it("BFS bidirecional reconstrói a rota passando pelo ponto de encontro", () => {
    const grid = parseGrid([
      "S...#",
      "###.#",
      "....#",
      ".####",
      "....G",
    ]);
    const out = bidirectionalBfsGrid(grid);
    expectValidPath(grid, out);
    expect(out.pathCost).toBe(bfsGrid(grid).pathCost);
    expect(new Set(out.path).size).toBe(out.path.length);
  });

  it("A* expande no máximo o que o Dijkstra expande em grid aberto", () => {
    const grid = createEmptyMaze(40);
    expect(astarGrid(grid).nodeExpansions).toBeLessThanOrEqual(dijkstraGrid(grid).nodeExpansions);
  });

  it("A* continua ótimo com custos positivos (heurística escalada pelo menor custo)", () => {
    const grid = openGridWithObstacles(25, 11);
    const rng = createRng(5);
    grid.costs = new Float64Array(grid.walls.length).map(() => 0.5 + Math.floor(rng() * 4));
    if (!dijkstraGrid(grid).found) return;
    expect(astarGrid(grid).pathCost).toBeCloseTo(dijkstraGrid(grid).pathCost!, 9);
  });
});

describe("Greedy Best-First", () => {
  it.each(mazes.map((g, i) => [i, g] as const))("retorna caminho válido, custo ≥ ótimo (grid %i)", (_, grid) => {
    const out = greedyGrid(grid);
    expectValidPath(grid, out);
    expect(out.pathCost!).toBeGreaterThanOrEqual(dijkstraGrid(grid).pathCost!);
  });

  it("não garante o ótimo: há grids em que o caminho é mais longo", () => {
    let suboptimal = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const grid = openGridWithObstacles(25, seed);
      const ref = dijkstraGrid(grid);
      if (!ref.found) continue;
      const out = greedyGrid(grid);
      expectValidPath(grid, out);
      if (out.pathCost! > ref.pathCost!) suboptimal++;
    }
    expect(suboptimal).toBeGreaterThan(0);
  });
});

describe("metaheurísticas", () => {
  it.each(mazes.map((g, i) => [i, g] as const))("ACO e GA retornam rotas válidas (grid %i)", (_, grid) => {
    const ref = dijkstraGrid(grid).pathCost!;
    for (const id of ["aco", "ga"] as const) {
      const out = MAZE_ALGORITHMS[id].search(grid, ctx(id));
      expectValidPath(grid, out);
      expect(new Set(out.path).size).toBe(out.path.length); // sem ciclos
      expect(out.pathCost!).toBeGreaterThanOrEqual(ref);
    }
  });

  it("são determinísticas dada a semente", () => {
    const grid = mazes[0];
    expect(acoGrid(grid, ctx("aco", 3)).path).toEqual(acoGrid(grid, ctx("aco", 3)).path);
    expect(gaGrid(grid, ctx("ga", 3)).path).toEqual(gaGrid(grid, ctx("ga", 3)).path);
  });

  it("GA respeita o critério de parada por gerações", () => {
    const grid = mazes[0];
    const params = { ...defaultParams(GA_PARAMS), generations: 3, stagnationLimit: 0 };
    const out = gaGrid(grid, { rng: createRng(1), params });
    expect(out.operations.generationsRun).toBe(3);
  });
});

describe("sem caminho", () => {
  const blocked = parseGrid([
    "S.#..",
    "..#..",
    "###..",
    ".....",
    "....G",
  ]);
  it.each(MAZE_ALGORITHM_IDS)("%s informa ausência de caminho", (id) => {
    const out = MAZE_ALGORITHMS[id].search(blocked, ctx(id));
    expect(out.found).toBe(false);
    expect(out.path).toEqual([]);
    expect(out.pathCost).toBeNull();
  });
});

describe("convenções de métricas", () => {
  it.each(MAZE_ALGORITHM_IDS)("%s: pathCells = células do caminho, expansões > 0, explorada marcada", (id) => {
    const grid = mazes[1];
    const outcome = solveMaze(grid, id, { seeds: [1, 2] });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const r = outcome.result;
    expect(r.pathCells).toBe(r.path.length);
    expect(r.pathCost).toBe(r.pathCells - 1);
    expect(r.nodeExpansions).toBeGreaterThan(0);
    expect(r.timeMs).toBeGreaterThanOrEqual(0);
    // Busca unidirecional expande todo o caminho; a bidirecional para quando as
    // frentes se tocam, então células perto do encontro só foram descobertas.
    if (id !== "bidirectionalBfs") for (const i of r.path) if (i !== grid.start) expect(r.explored[i]).toBe(1);
    if (!r.stochastic) expect(r.explored.reduce((a, b) => a + b, 0)).toBe(r.nodeExpansions);
    expect(r.runs).toHaveLength(MAZE_ALGORITHMS[id].stochastic ? 2 : 1);
  });

  it("rejeita parâmetros inválidos", () => {
    const { errors } = validateParams(ACO_PARAMS, { ants: "0", evaporation: "1.5", alpha: "x" });
    expect(Object.keys(errors).sort()).toEqual(["alpha", "ants", "evaporation"]);
    const v = validateParams(GA_PARAMS, { populationSize: "12.5" });
    expect(v.errors.populationSize).toMatch(/inteiro/);
    const outcome = solveMaze(mazes[0], "aco", { params: { ants: 0 } });
    expect(outcome.ok).toBe(false);
  });
});

describe("gap e optimalidade", () => {
  it("calcula o gap percentual", () => {
    expect(computeGap(10, 10)).toBe(0);
    expect(computeGap(15, 10)).toBe(50);
    expect(computeGap(null, 10)).toBeNull();
    expect(computeGap(12, null)).toBeNull();
    expect(computeGap(0, 0)).toBe(0);
    expect(computeGap(3, 0)).toBeNull();
  });

  it("usa o Dijkstra como referência e diferencia garantia de observação", () => {
    const grid = mazes[4];
    const results = (["dijkstra", "greedy", "aco"] as const).map((id) => {
      const o = solveMaze(grid, id, { seeds: [9] });
      if (!o.ok) throw new Error(o.error);
      return o.result;
    });
    const optimal = referenceOptimalCost(results);
    expect(optimal).toBe(dijkstraGrid(grid).pathCost);
    expect(computeGap(results[0].pathCost, optimal)).toBe(0);
    expect(optimalityVerdict(results[0], optimal)).toBe("guaranteed");
    for (const r of results.slice(1)) {
      const v = optimalityVerdict(r, optimal);
      expect(v === "observed-optimal" || v === "suboptimal").toBe(true);
      expect(v === "suboptimal").toBe(computeGap(r.pathCost, optimal)! > 0);
    }
    expect(referenceOptimalCost(results.slice(1))).toBeNull();
  });
});

describe("execuções repetidas", () => {
  it("registra cada execução e agrega média, desvio, melhor e taxa de sucesso", () => {
    const grid = mazes[5];
    const seeds = [11, 22, 33, 44];
    const outcome = solveMaze(grid, "ga", { seeds });
    if (!outcome.ok) throw new Error(outcome.error);
    const r = outcome.result;
    expect(r.runs.map((x) => x.seed)).toEqual(seeds);
    const agg = aggregateRuns(r.runs);
    expect(agg.runs).toBe(4);
    expect(agg.successes).toBe(4);
    expect(agg.successRate).toBe(1);
    expect(agg.cost!.best).toBe(r.pathCost); // resultado exibido = melhor execução
    expect(agg.cost!.best).toBeLessThanOrEqual(agg.cost!.mean);
    expect(r.timeMs).toBeCloseTo(agg.time.mean, 9);
  });

  it("estatísticas numéricas", () => {
    const s = numberStats([2, 4, 4, 4, 5, 5, 7, 9])!;
    expect(s.mean).toBe(5);
    expect(s.std).toBeCloseTo(2.138, 3);
    expect(s.best).toBe(2);
    expect(numberStats([3])!.std).toBe(0);
    expect(numberStats([])).toBeNull();
  });

  it("taxa de sucesso conta execuções sem caminho", () => {
    const agg = aggregateRuns([
      { seed: 1, found: true, pathCost: 10, pathCells: 11, timeMs: 1, nodeExpansions: 5 },
      { seed: 2, found: false, pathCost: null, pathCells: 0, timeMs: 3, nodeExpansions: 9 },
    ]);
    expect(agg.successRate).toBe(0.5);
    expect(agg.cost!.mean).toBe(10);
    expect(agg.time.mean).toBe(2);
  });
});

describe("comparação na mesma instância", () => {
  it("todos os algoritmos recebem o mesmo grid e nenhum o modifica", () => {
    const grid = mazes[2];
    const snapshot = { walls: grid.walls.slice(), start: grid.start, goal: grid.goal };
    const seen: MazeGrid[] = [];
    const original = MAZE_ALGORITHM_IDS.map((id) => MAZE_ALGORITHMS[id].search);
    MAZE_ALGORITHM_IDS.forEach((id, k) => {
      MAZE_ALGORITHMS[id].search = (g, c) => {
        seen.push(g);
        return original[k](g, c);
      };
    });
    try {
      const events: RunnerEvent[] = [];
      const jobs = buildJobs(MAZE_ALGORITHM_IDS, { aco: { runs: 2 }, ga: { runs: 2 } }, createRng(1));
      runJobsSync(grid, jobs, (e) => events.push(e));
      const results = events.filter((e) => e.type === "result");
      expect(results).toHaveLength(MAZE_ALGORITHM_IDS.length);
      expect(events.some((e) => e.type === "error")).toBe(false);
      expect(seen.every((g) => g === grid)).toBe(true);
      expect(grid.walls).toEqual(snapshot.walls);
      expect([grid.start, grid.goal]).toEqual([snapshot.start, snapshot.goal]);
      // Determinísticos rodam uma vez só; estocásticos, uma por semente.
      expect(jobs.find((j) => j.algorithmId === "bfs")!.seeds).toHaveLength(1);
      expect(jobs.find((j) => j.algorithmId === "aco")!.seeds).toHaveLength(2);
    } finally {
      MAZE_ALGORITHM_IDS.forEach((id, k) => (MAZE_ALGORITHMS[id].search = original[k]));
    }
  });

  it("não executa algoritmos não selecionados", () => {
    const events: RunnerEvent[] = [];
    runJobsSync(mazes[0], buildJobs(["bfs", "astar"], {}), (e) => events.push(e));
    const ids = events.filter((e) => e.type === "result").map((e) => e.type === "result" && e.result.algorithmId);
    expect(ids).toEqual(["bfs", "astar"]);
  });
});

describe("visualização dos resultados", () => {
  it("alternar o algoritmo exibido não reexecuta nem altera resultados", () => {
    let state = initMazeState(15);
    const events: RunnerEvent[] = [];
    runJobsSync(state.grid, buildJobs(["dijkstra", "greedy", "bfs"], {}), (e) => events.push(e));
    state = mazeReducer(state, { type: "startRun" });
    for (const e of events) if (e.type === "result") state = mazeReducer(state, { type: "addResult", result: e.result });
    const results = state.results;
    expect(results).toHaveLength(3);
    expect(state.view).toBe("auto");

    state = mazeReducer(state, { type: "selectResult", algorithmId: "greedy" });
    expect(state.selectedId).toBe("greedy");
    expect(state.view).toBe("single");
    expect(state.results).toBe(results);

    state = mazeReducer(state, { type: "setView", view: "grid" });
    expect(state.results).toBe(results);
    expect(state.grid).toBeDefined();
  });

  it("editar o labirinto descarta resultados e seleção", () => {
    let state = initMazeState(10);
    const o = solveMaze(state.grid, "bfs");
    if (!o.ok) throw new Error(o.error);
    state = mazeReducer(state, { type: "addResult", result: o.result });
    state = mazeReducer(state, { type: "selectResult", algorithmId: "bfs" });
    state = mazeReducer(state, { type: "editCell", mode: "wall", index: 5 });
    expect(state.results).toEqual([]);
    expect(state.selectedId).toBeNull();
  });
});

describe("grids grandes", () => {
  it("algoritmos exatos e heurísticos resolvem o maior grid rapidamente", () => {
    const grid = generateMaze(MAZE_LIMITS.maxSize, { rng: createRng(8) });
    const t0 = performance.now();
    for (const id of ["dijkstra", "bfs", "bidirectionalBfs", "astar", "greedy"] as const) {
      const out = MAZE_ALGORITHMS[id].search(grid, ctx(id));
      expect(out.found).toBe(true);
    }
    expect(performance.now() - t0).toBeLessThan(8000);
  });

  it("ACO e GA terminam em grid grande com parâmetros reduzidos", () => {
    const grid = generateMaze(301, { rng: createRng(9) });
    const t0 = performance.now();
    const aco = acoGrid(grid, {
      rng: createRng(1),
      params: { ...defaultParams(ACO_PARAMS), ants: 5, iterations: 3 },
    });
    const ga = gaGrid(grid, {
      rng: createRng(1),
      params: { ...defaultParams(GA_PARAMS), populationSize: 8, generations: 5 },
    });
    expectValidPath(grid, aco);
    expectValidPath(grid, ga);
    expect(performance.now() - t0).toBeLessThan(15000);
  });
});
