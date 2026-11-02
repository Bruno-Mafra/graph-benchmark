import { describe, expect, it } from "vitest";
import type { Node, Edge as RFEdge } from "reactflow";
import { buildInstance, arcWeight } from "./types";
import type { Graph, GraphInstance } from "./types";
import { analyzeGraph, findNegativeCycle } from "./analysis";
import { GRAPH_ALGORITHMS, GRAPH_ALGORITHM_IDS, APSP_LIMITS } from "./algorithms/registry";
import { heuristicScale } from "./algorithms/pointToPoint";
import type { GraphAlgorithmId } from "./algorithms/types";
import {
  generateDag,
  generateDense,
  generateDisconnected,
  generateGeometric,
  generateGrid,
  generateNegativeCycle,
  generateNegativeWeights,
  generateSparse,
  generatedToGraph,
} from "./generators";
import type { GeneratedGraph } from "./generators";
import { runGraphJob, growthInstance, runGrowthJob } from "./benchmark/runner";
import type { GraphRunResult, GrowthPoint } from "./benchmark/runner";
import { checkConsistency, referenceResult } from "./benchmark/consistency";
import { editorToGraph, makeEditorEdge, semanticSignature } from "./editorModel";
import { circleLayout, countCrossings, forceLayout, layeredLayout } from "./layout";
import { timingStats } from "../benchmark/measure";
import { createRng } from "../utils/random";

// ------------------------------------------------------------------ referência

/** Bellman-Ford ingênuo e independente: distâncias com −∞ para vértices afetados por ciclo negativo. */
function naiveDistances(adj: Graph, s: number): number[] {
  const n = adj.length;
  const d = new Array<number>(n).fill(Infinity);
  d[s] = 0;
  for (let i = 0; i < n - 1; i++)
    for (let u = 0; u < n; u++)
      for (const { to, weight } of adj[u]) if (d[u] + weight < d[to]) d[to] = d[u] + weight;
  for (let i = 0; i < n; i++)
    for (let u = 0; u < n; u++)
      for (const { to, weight } of adj[u])
        if (d[u] !== Infinity && (d[u] === -Infinity || d[u] + weight < d[to])) d[to] = -Infinity;
  return d;
}

function inst(gen: GeneratedGraph, positions?: Float64Array): GraphInstance {
  return buildInstance(generatedToGraph(gen), positions ?? gen.positions ?? null);
}

function analysisOf(gen: GeneratedGraph, g: GraphInstance) {
  const undirected = gen.edges.filter((e) => e.bidirectional).length;
  return analyzeGraph(g, { directed: gen.edges.length - undirected, undirected });
}

function expectValidPath(g: GraphInstance, path: number[], s: number, t: number, cost: number) {
  expect(path[0]).toBe(s);
  expect(path[path.length - 1]).toBe(t);
  let sum = 0;
  for (let i = 1; i < path.length; i++) {
    const w = arcWeight(g, path[i - 1], path[i]);
    expect(w).toBeDefined();
    sum += w!;
  }
  expect(sum).toBeCloseTo(cost, 9);
}

function run(g: GraphInstance, id: GraphAlgorithmId, source: number, target: number | null = null): GraphRunResult {
  return runGraphJob(g, { source, target }, { algorithmId: id, samples: 1 });
}

const P2P: GraphAlgorithmId[] = ["dijkstraTarget", "astar", "bidirectionalDijkstra"];
const APSP: GraphAlgorithmId[] = ["floydWarshall", "johnson"];

/** Roda todo algoritmo compatível e confere distâncias, caminhos e consistência. */
function checkAll(gen: GeneratedGraph, source = 0, target: number | null = null, positions?: Float64Array) {
  const g = inst(gen, positions);
  const a = analysisOf(gen, g);
  const ref = naiveDistances(generatedToGraph(gen), source);
  const ran: GraphAlgorithmId[] = [];
  const results: GraphRunResult[] = [];
  for (const id of GRAPH_ALGORITHM_IDS) {
    if (!GRAPH_ALGORITHMS[id].check(a, { source, target }).ok) continue;
    ran.push(id);
    const r = run(g, id, source, target);
    results.push(r);
    if (r.sourceDistances) {
      expect(Array.from(r.sourceDistances)).toEqual(ref.map((x) => (Number.isFinite(x) ? expect.closeTo(x, 9) : x)));
      // Caminho de cada vértice alcançável reconstruído pelos predecessores.
      for (let v = 0; v < g.n; v++) {
        if (!Number.isFinite(ref[v]) || r.status !== "ok") continue;
        const path: number[] = [v];
        for (let x = v; x !== source; x = r.sourcePrev![x]) path.push(r.sourcePrev![x]);
        expectValidPath(g, path.reverse(), source, v, ref[v]);
      }
    }
    if (target != null && r.target) {
      expect(r.target.distance).toEqual(Number.isFinite(ref[target]) ? expect.closeTo(ref[target], 9) : ref[target]);
      if (Number.isFinite(ref[target])) expectValidPath(g, r.target.path!, source, target, ref[target]);
      else expect(r.target.path).toBeNull();
    }
  }
  const reference = referenceResult(results);
  for (const r of results) expect(checkConsistency(r, reference).status).not.toBe("mismatch");
  return { ran, results, analysis: a };
}

// ---------------------------------------------------------------------- testes

describe("algoritmos — corretude contra referência ingênua", () => {
  it.each([1, 2, 3, 4, 5])("grafos esparsos dirigidos com pesos ≥ 0 (semente %i)", (seed) => {
    const gen = generateSparse(60, { rng: createRng(seed) });
    const { ran } = checkAll(gen, 0, 59, forceLayout(60, gen.edges.map((e) => [e.u, e.v])));
    expect(ran).toEqual(expect.arrayContaining(["dijkstra", "bellmanFord", ...P2P, ...APSP]));
    expect(ran).not.toContain("bfs");
  });

  it.each([1, 2, 3])("grafos geométricos não direcionados (semente %i)", (seed) => {
    const gen = generateGeometric(120, { rng: createRng(seed) });
    const { ran } = checkAll(gen, 3, 97);
    expect(ran).not.toContain("dagShortestPath");
  });

  it.each([1, 2, 3])("pesos negativos sem ciclo negativo (semente %i)", (seed) => {
    const gen = generateNegativeWeights(50, { rng: createRng(seed) });
    const { ran, analysis } = checkAll(gen, 0, 30);
    expect(analysis.hasNegative).toBe(true);
    expect(analysis.negativeCycle.status).toBe("none");
    expect(ran).toEqual(expect.arrayContaining(["bellmanFord", "johnson", "floydWarshall"]));
    for (const id of ["dijkstra", "astar", "bidirectionalDijkstra", "dijkstraTarget"]) expect(ran).not.toContain(id);
  });

  it.each([1, 2, 3])("DAG com pesos negativos (semente %i)", (seed) => {
    const gen = generateDag(80, { rng: createRng(seed), negative: true });
    const { ran, analysis } = checkAll(gen, 0, 79);
    expect(analysis.isDag).toBe(true);
    expect(ran).toContain("dagShortestPath");
  });

  it("grafos densos e grade", () => {
    checkAll(generateDense(25, { rng: createRng(9) }), 4, 20);
    checkAll(generateGrid(6, 7, { rng: createRng(4) }), 0, 41);
  });

  it("BFS: pesos unitários e pesos iguais c > 1", () => {
    const unit = generateGrid(5, 5, { weights: "unit" });
    expect(checkAll(unit, 0, 24).ran).toContain("bfs");
    const three = generateSparse(40, { rng: createRng(2), weights: "unit" });
    three.edges.forEach((e) => (e.w = 3));
    const { ran } = checkAll(three, 0, 39);
    expect(ran).toContain("bfs");
  });

  it("destino inalcançável: Infinity e sem caminho", () => {
    const gen = generateDisconnected(40, { rng: createRng(3) });
    const g = inst(gen);
    for (const id of [...P2P, "dijkstra"] as GraphAlgorithmId[]) {
      const r = run(g, id, 0, 39);
      expect(r.target!.distance).toBe(Infinity);
      expect(r.target!.path).toBeNull();
      expect(r.status).toBe("ok");
    }
    checkAll(gen, 0, 39);
  });

  it("origem igual ao destino", () => {
    const g = inst(generateSparse(10, { rng: createRng(1) }));
    for (const id of P2P) {
      const r = run(g, id, 4, 4);
      expect(r.target!.distance).toBe(0);
      expect(r.target!.path).toEqual([4]);
    }
  });

  it("A*: heurística calibrada é admissível mesmo com posições arbitrárias", () => {
    const gen = generateSparse(80, { rng: createRng(12) });
    const rng = createRng(99);
    const randomPositions = Float64Array.from({ length: 160 }, () => rng() * 2000);
    const g = inst(gen, randomPositions);
    const c = heuristicScale(g);
    for (let u = 0; u < g.n; u++)
      for (let k = g.offsets[u]; k < g.offsets[u + 1]; k++) {
        const v = g.targets[k];
        const d = Math.hypot(randomPositions[2 * u] - randomPositions[2 * v], randomPositions[2 * u + 1] - randomPositions[2 * v + 1]);
        expect(c * d).toBeLessThanOrEqual(g.weights[k] + 1e-9);
      }
    for (let t = 1; t < 80; t += 7) checkAll(gen, 0, t, randomPositions);
  });

  it("A* expande menos que o Dijkstra até o destino em grafo geométrico", () => {
    const gen = generateGeometric(800, { rng: createRng(5) });
    const g = inst(gen);
    const { query } = { query: { source: 0, target: 700 } };
    const a = run(g, "astar", query.source, query.target);
    const d = run(g, "dijkstraTarget", query.source, query.target);
    expect(a.target!.distance).toBeCloseTo(d.target!.distance, 9);
    expect(a.counters.expansions).toBeLessThanOrEqual(d.counters.expansions);
    expect(a.info!.heuristicScale).toBeGreaterThan(0);
  });
});

describe("Duan et al. (2025) — experimental", () => {
  it("bate com a referência com muitos pesos zero (ciclos de peso 0)", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rng = createRng(seed);
      const n = 5 + Math.floor(rng() * 60);
      const graph: Graph = Array.from({ length: n }, () => []);
      for (let i = 0; i < n * 3; i++) {
        graph[Math.floor(rng() * n)].push({ to: Math.floor(rng() * n), weight: rng() < 0.4 ? 0 : Math.floor(rng() * 9) + 1 });
      }
      const g = buildInstance(graph);
      const r = run(g, "duanSssp", 0);
      const ref = naiveDistances(graph, 0);
      expect(Array.from(r.sourceDistances!)).toEqual(ref);
      for (let v = 1; v < n; v++) {
        if (!Number.isFinite(ref[v])) continue;
        const path: number[] = [v];
        for (let x = v; x !== 0; x = r.sourcePrev![x]) path.push(r.sourcePrev![x]);
        expectValidPath(g, path.reverse(), 0, v, ref[v]);
      }
    }
  });

  it("não reprocessa vértices em cascata e reporta contadores da transformação", () => {
    const { g } = growthInstance(2000, 3);
    const r = run(g, "duanSssp", 0);
    expect(r.status).toBe("ok");
    const transformed = r.counters.extra.transformedVertices;
    expect(transformed).toBe(g.targets.length);
    // Antes do ajuste no intervalo K eram ~470 expansões por vértice transformado.
    expect(r.counters.expansions / transformed).toBeLessThan(20);
  });

  it("não é selecionável com pesos negativos e marca-se como experimental", () => {
    const a = analyzeGraph(inst(generateNegativeWeights(20, { rng: createRng(1) })));
    expect(GRAPH_ALGORITHMS.duanSssp.check(a, { source: 0, target: null })).toMatchObject({ ok: false });
    expect(GRAPH_ALGORITHMS.duanSssp.experimental).toBeTruthy();
  });
});

describe("ciclos negativos", () => {
  it.each([1, 2, 3])("Bellman-Ford marca −∞ exatamente nos vértices afetados (semente %i)", (seed) => {
    const gen = generateNegativeCycle(40, { rng: createRng(seed) });
    const g = inst(gen);
    const r = run(g, "bellmanFord", 0, 39);
    expect(r.status).toBe("negative-cycle");
    expect(Array.from(r.sourceDistances!)).toEqual(naiveDistances(generatedToGraph(gen), 0));
    expect(r.target!.path).toBeNull();
  });

  it("Floyd-Warshall detecta e marca −∞; Johnson aborta; análise encontra o ciclo", () => {
    const gen = generateNegativeCycle(30, { rng: createRng(4) });
    const g = inst(gen);
    const fw = run(g, "floydWarshall", 0, 10);
    expect(fw.status).toBe("negative-cycle");
    expect(Array.from(fw.sourceDistances!)).toEqual(naiveDistances(generatedToGraph(gen), 0));
    const jo = run(g, "johnson", 0, 10);
    expect(jo.status).toBe("negative-cycle");
    expect(jo.sourceDistances).toBeNull();

    const info = findNegativeCycle(g);
    expect(info.status).toBe("found");
    if (info.status !== "found") return;
    // O ciclo devolvido existe e tem soma negativa.
    let sum = 0;
    for (let i = 0; i < info.cycle.length; i++) {
      const w = arcWeight(g, info.cycle[i], info.cycle[(i + 1) % info.cycle.length]);
      expect(w).toBeDefined();
      sum += w!;
    }
    expect(sum).toBeLessThan(0);
  });

  it("ciclo negativo inalcançável não invalida o Bellman-Ford a partir da origem", () => {
    // 0 → 1 ; 2 → 3 → 2 com soma negativa, inalcançável a partir de 0.
    const graph: Graph = [[{ to: 1, weight: 2 }], [], [{ to: 3, weight: 1 }], [{ to: 2, weight: -4 }]];
    const g = buildInstance(graph);
    const r = run(g, "bellmanFord", 0);
    expect(r.status).toBe("ok");
    expect(Array.from(r.sourceDistances!)).toEqual([0, 2, Infinity, Infinity]);
    expect(analyzeGraph(g).negativeCycle.status).toBe("found");
  });

  it("aresta não direcionada com peso negativo é um ciclo negativo", () => {
    const e = [makeEditorEdge("e1", "a", "b", -1, true)];
    const nodes = ["a", "b"].map((id) => ({ id, position: { x: 0, y: 0 }, data: { label: id } })) as Node[];
    const { graph } = editorToGraph(nodes, e);
    const a = analyzeGraph(buildInstance(graph), { directed: 0, undirected: 1 });
    expect(a.negativeCycle.status).toBe("found");
    expect(GRAPH_ALGORITHMS.dijkstra.check(a, { source: 0, target: null })).toMatchObject({ ok: false });
  });
});

describe("compatibilidade", () => {
  const q: { source: number | null; target: number | null } = { source: 0, target: 3 };
  const analysis = (graph: Graph, undirected = 0) =>
    analyzeGraph(buildInstance(graph), { directed: graph.flat().length - 2 * undirected, undirected });
  const reason = (id: GraphAlgorithmId, a: ReturnType<typeof analysis>, query = q) => {
    const c = GRAPH_ALGORITHMS[id].check(a, query);
    return c.ok ? null : c.reason;
  };

  it("pesos negativos bloqueiam Dijkstra, A* e bidirecional, mas não Bellman-Ford", () => {
    const a = analysis([[{ to: 1, weight: -2 }], [{ to: 2, weight: 1 }], [{ to: 3, weight: 1 }], []]);
    expect(reason("dijkstra", a)).toMatch(/negativos/);
    expect(reason("astar", a)).toMatch(/negativos/);
    expect(reason("bidirectionalDijkstra", a)).toMatch(/negativos/);
    expect(reason("bellmanFord", a)).toBeNull();
    expect(reason("dagShortestPath", a)).toBeNull();
  });

  it("BFS exige pesos iguais", () => {
    expect(reason("bfs", analysis([[{ to: 1, weight: 1 }], [{ to: 2, weight: 2 }], [], []]))).toMatch(/iguais/);
    expect(reason("bfs", analysis([[{ to: 1, weight: 4 }], [{ to: 2, weight: 4 }], [], []]))).toBeNull();
  });

  it("DAG exige grafo dirigido acíclico", () => {
    const cyclic = analysis([[{ to: 1, weight: 1 }], [{ to: 0, weight: 1 }], [], []]);
    expect(reason("dagShortestPath", cyclic)).toMatch(/ciclo/);
    const undirected = analysis([[{ to: 1, weight: 1 }], [{ to: 0, weight: 1 }], [], []], 1);
    expect(reason("dagShortestPath", undirected)).toMatch(/não direcionadas/);
  });

  it("origem → destino exige destino; todos os pares respeitam limites e ciclo negativo", () => {
    const a = analysis([[{ to: 1, weight: 1 }], [], [], []]);
    expect(reason("astar", a, { source: 0, target: null })).toMatch(/destino/);
    expect(reason("dijkstra", a, { source: null, target: null })).toMatch(/origem/);
    const big = { ...a, n: APSP_LIMITS.floydWarshall + 1 };
    expect(reason("floydWarshall", big)).toMatch(/limite/);
    const neg = analyzeGraph(inst(generateNegativeCycle(10, { rng: createRng(1) })));
    expect(reason("johnson", neg)).toMatch(/ciclo negativo/);
    expect(reason("floydWarshall", neg)).toBeNull();
  });

  it("nenhuma verificação altera o grafo", () => {
    const g = inst(generateNegativeWeights(30, { rng: createRng(5) }));
    const snapshot = Array.from(g.weights);
    const a = analyzeGraph(g);
    for (const id of GRAPH_ALGORITHM_IDS) {
      GRAPH_ALGORITHMS[id].check(a, q);
      if (GRAPH_ALGORITHMS[id].check(a, q).ok) run(g, id, 0, 3);
    }
    expect(Array.from(g.weights)).toEqual(snapshot);
  });
});

describe("análise e modelo do editor", () => {
  const nodes = ["a", "b", "c"].map((id, i) => ({ id, position: { x: i * 10, y: 0 }, data: { label: id.toUpperCase() } })) as Node[];

  it("aresta não direcionada vira dois arcos; arestas soltas são contadas, não usadas", () => {
    const edges: RFEdge[] = [
      makeEditorEdge("1", "a", "b", 2, true),
      makeEditorEdge("2", "b", "c", 5, false),
      makeEditorEdge("3", "c", "zzz", 1, false),
    ];
    const eg = editorToGraph(nodes, edges);
    expect(eg.graph).toEqual([[{ to: 1, weight: 2 }], [{ to: 0, weight: 2 }, { to: 2, weight: 5 }], []]);
    expect(eg.danglingEdges).toBe(1);
    expect(eg.labels).toEqual(["A", "B", "C"]);
    const a = analyzeGraph(buildInstance(eg.graph), { directed: 1, undirected: 1 });
    expect(a.directedness).toBe("mixed");
    expect(a.isDag).toBe(false);
    expect(a.uniformWeight).toBeNull();
    expect(a.weakComponents).toBe(1);
  });

  it("assinatura semântica ignora posição e rótulo, mas não peso/direção", () => {
    const edges = [makeEditorEdge("1", "a", "b", 2, false)];
    const sig = semanticSignature(nodes, edges);
    const moved = nodes.map((n) => ({ ...n, position: { x: 999, y: 1 }, data: { label: "X" } }));
    expect(semanticSignature(moved, edges)).toBe(sig);
    expect(semanticSignature(nodes, [makeEditorEdge("1", "a", "b", 3, false)])).not.toBe(sig);
    expect(semanticSignature(nodes, [makeEditorEdge("1", "a", "b", 2, true)])).not.toBe(sig);
  });
});

describe("geradores", () => {
  it.each([1, 2, 3])("esparso, DAG e geométrico: tudo alcançável a partir de 0 (semente %i)", (seed) => {
    for (const gen of [
      generateSparse(300, { rng: createRng(seed) }),
      generateDag(300, { rng: createRng(seed) }),
      generateGeometric(300, { rng: createRng(seed) }),
    ]) {
      expect(naiveDistances(generatedToGraph(gen), 0).every(Number.isFinite)).toBe(true);
    }
    expect(analyzeGraph(inst(generateDag(200, { rng: createRng(seed), negative: true }))).isDag).toBe(true);
  });

  it("pesos negativos: muitos negativos e nunca ciclo negativo", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = inst(generateNegativeWeights(40, { rng: createRng(seed) }));
      expect(findNegativeCycle(g).status).toBe("none");
      expect(analyzeGraph(g).hasNegative).toBe(true);
    }
  });

  it("geométrico: pontos não se sobrepõem (distância mínima entre nós)", () => {
    const gen = generateGeometric(300, { rng: createRng(4) });
    const p = gen.positions!;
    let close = 0;
    for (let i = 0; i < gen.n; i++)
      for (let j = i + 1; j < gen.n; j++) if (Math.hypot(p[2 * i] - p[2 * j], p[2 * i + 1] - p[2 * j + 1]) < 50) close++;
    expect(close).toBe(0);
  });

  it("desconexo: a segunda metade é inalcançável a partir de 0", () => {
    const d = naiveDistances(generatedToGraph(generateDisconnected(40, { rng: createRng(1) })), 0);
    expect(d.slice(20).every((x) => x === Infinity)).toBe(true);
  });
});

describe("layouts", () => {
  it("camadas: todo arco de um DAG aponta para baixo", () => {
    const gen = generateDag(120, { rng: createRng(2) });
    const pos = layeredLayout(gen.n, gen.edges.map((e) => [e.u, e.v]));
    for (const e of gen.edges) expect(pos[2 * e.v + 1]).toBeGreaterThan(pos[2 * e.u + 1]);
  });

  it("forças: posições finitas, sem sobreposição e menos cruzamentos que o círculo", () => {
    const gen = generateGeometric(150, { rng: createRng(8) });
    const pairs = gen.edges.map((e) => [e.u, e.v] as [number, number]);
    const pos = forceLayout(gen.n, pairs);
    expect(Array.from(pos).every(Number.isFinite)).toBe(true);
    let minD = Infinity;
    for (let i = 0; i < gen.n; i++)
      for (let j = i + 1; j < gen.n; j++)
        minD = Math.min(minD, Math.hypot(pos[2 * i] - pos[2 * j], pos[2 * i + 1] - pos[2 * j + 1]));
    expect(minD).toBeGreaterThan(15);
    expect(countCrossings(pos, pairs)).toBeLessThan(countCrossings(circleLayout(gen.n), pairs) / 3);
  });

  it("forças em grafo grande termina rápido", () => {
    const gen = generateSparse(5000, { rng: createRng(1) });
    const t0 = performance.now();
    forceLayout(gen.n, gen.edges.map((e) => [e.u, e.v]));
    expect(performance.now() - t0).toBeLessThan(10000);
  });
});

describe("benchmark", () => {
  it("estatísticas de tempo: mediana, média e desvio", () => {
    const s = timingStats([5, 1, 3, 100], 4);
    expect(s.medianMs).toBe(4);
    expect(s.minMs).toBe(1);
    expect(s.maxMs).toBe(100);
    expect(s.samples).toBe(4);
    expect(timingStats([2], 1).stdMs).toBe(0);
  });

  it("resultado traz tempo e contagens padronizadas; consistência detecta divergência", () => {
    const g = inst(generateSparse(50, { rng: createRng(1) }));
    const d = run(g, "dijkstra", 0, 10);
    const b = run(g, "bellmanFord", 0, 10);
    expect(d.timing.samples).toBe(1);
    expect(d.timing.medianMs).toBeGreaterThan(0);
    expect(d.counters.expansions).toBe(d.reached);
    expect(d.counters.edgeScans).toBeGreaterThanOrEqual(d.counters.relaxations);
    const ref = referenceResult([b, d]);
    expect(ref).toBe(d);
    expect(checkConsistency(b, ref).status).toBe("match");
    const broken = { ...b, sourceDistances: b.sourceDistances!.map((x, i) => (i === 3 ? x + 1 : x)) };
    expect(checkConsistency(broken, ref)).toEqual({ status: "mismatch", count: 1 });
  });

  it("curva de crescimento: mesmo grafo para a mesma semente; limites respeitados", () => {
    const a = growthInstance(300, 7);
    const b = growthInstance(300, 7);
    expect(Array.from(a.g.weights)).toEqual(Array.from(b.g.weights));
    expect(a.query.target).not.toBe(0);
    const points: GrowthPoint[] = [];
    runGrowthJob({ algorithmId: "floydWarshall", sizes: [100, 700], seed: 1, samples: 1 }, (p) => points.push(p));
    expect(points[0].medianMs).toBeGreaterThan(0);
    expect(points[1].medianMs).toBeNull();
    expect(points[1].skippedReason).toMatch(/limite/);
  });
});
