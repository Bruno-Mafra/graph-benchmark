import type { GraphAnalysis } from "../analysis";
import { bellmanFord, bfs, dagShortestPath, dijkstra, dijkstraToTarget } from "./singleSource";
import { astar, bidirectionalDijkstra } from "./pointToPoint";
import { floydWarshall, johnson } from "./allPairs";
import { ssspOnGraph } from "./duanSssp";
import type { Edge as DuanEdge } from "./duanSssp";
import type { GraphInstance } from "../types";
import type { Compatibility, GraphAlgorithm, GraphAlgorithmId, ProblemKind } from "./types";

/** Limites de tamanho para algoritmos de todos os pares (tempo/memória no navegador). */
export const APSP_LIMITS = { floydWarshall: 600, johnson: 2000 } as const;
/** Limite do algoritmo experimental de Duan et al. (lento; ver duanSssp.ts). */
export const DUAN_MAX_VERTICES = 20000;

/**
 * Duan et al. (2025): adapta a instância CSR para a lista de adjacência que a
 * implementação usa (dentro do tempo medido, pois faz parte do algoritmo junto
 * com a transformação de grau constante) e devolve o formato padrão.
 */
function runDuan(g: GraphInstance, source: number) {
  const adj: DuanEdge[][] = Array.from({ length: g.n }, (_, u) => {
    const out: DuanEdge[] = [];
    for (let k = g.offsets[u]; k < g.offsets[u + 1]; k++) out.push({ to: g.targets[k], weight: g.weights[k] });
    return out;
  });
  const r = ssspOnGraph({ n: g.n, adj }, source);
  const dist = Float64Array.from(r.distances);
  const prev = Int32Array.from(r.predecessors, (p) => p ?? -1);
  const { expansions, edgeScans, relaxations, ...extra } = r.stats;
  return {
    kind: "sssp" as const,
    negativeCycle: false,
    dist,
    prev,
    counters: { expansions, edgeScans, relaxations, extra },
  };
}

type Q = { source: number | null; target: number | null };

const OK: Compatibility = { ok: true };

function needsSource(q: Q, a: GraphAnalysis): Compatibility | null {
  if (a.n === 0) return { ok: false, reason: "O grafo não tem vértices." };
  if (q.source == null) return { ok: false, reason: "Escolha um vértice de origem." };
  return null;
}

function needsTarget(q: Q): Compatibility | null {
  return q.target == null ? { ok: false, reason: "Escolha um vértice de destino (busca origem → destino)." } : null;
}

function noNegative(a: GraphAnalysis, name: string): Compatibility | null {
  if (!a.hasNegative) return null;
  const extra =
    a.undirectedEdges > 0 && a.directedness !== "directed"
      ? " (uma aresta não direcionada com peso negativo já é um ciclo negativo)"
      : "";
  return { ok: false, reason: `Há pesos negativos (mín. ${a.minWeight}); ${name} exige pesos ≥ 0${extra}.` };
}

function cycleText(a: GraphAnalysis): string {
  return a.negativeCycle.status === "found" ? ` (ciclo negativo detectado: ${a.negativeCycle.cycle.length} vértices)` : "";
}

const HEAP_EXPANSION = "Expansão = vértice retirado da fila de prioridade com distância definitiva.";

/** Algoritmos do benchmark de grafos, na ordem de exibição. */
export const GRAPH_ALGORITHMS: Record<GraphAlgorithmId, GraphAlgorithm> = {
  dijkstra: {
    id: "dijkstra",
    label: "Dijkstra",
    shortLabel: "Dijkstra",
    problem: "sssp",
    description: "Fixa sempre o vértice de menor distância provisória (heap binária).",
    complexity: "O((V + E) log V)",
    requirements: "Pesos ≥ 0.",
    expansionDefinition: HEAP_EXPANSION,
    check: (a, q) => needsSource(q, a) ?? noNegative(a, "o Dijkstra") ?? OK,
    run: (g, q) => dijkstra(g, q.source),
  },
  bellmanFord: {
    id: "bellmanFord",
    label: "Bellman-Ford",
    shortLabel: "Bellman-Ford",
    problem: "sssp",
    description: "Relaxa todos os arcos em rodadas; aceita pesos negativos e detecta ciclo negativo.",
    complexity: "O(V · E)",
    requirements: "Qualquer peso. Ciclo negativo alcançável torna distâncias −∞.",
    expansionDefinition: "Expansão = vértice com distância finita processado em uma rodada (somando as rodadas).",
    check: (a, q) => {
      const base = needsSource(q, a);
      if (base) return base;
      return a.negativeCycle.status === "found"
        ? { ok: true, note: "Há ciclo negativo no grafo: se for alcançável, as distâncias afetadas serão −∞." }
        : OK;
    },
    run: (g, q) => bellmanFord(g, q.source),
  },
  bfs: {
    id: "bfs",
    label: "BFS",
    shortLabel: "BFS",
    problem: "sssp",
    description: "Busca em largura com fila: conta saltos.",
    complexity: "O(V + E)",
    requirements: "Todos os arcos com o mesmo peso ≥ 0 (grafo sem pesos).",
    expansionDefinition: "Expansão = vértice retirado da fila FIFO.",
    check: (a, q) => {
      const base = needsSource(q, a);
      if (base) return base;
      if (a.arcs > 0 && a.uniformWeight === null) {
        return {
          ok: false,
          reason: `Pesos diferentes (de ${a.minWeight} a ${a.maxWeight}); BFS só é correto com pesos iguais.`,
        };
      }
      if (a.uniformWeight !== null && a.uniformWeight < 0) {
        return { ok: false, reason: "Todos os pesos são negativos; BFS exige peso comum ≥ 0." };
      }
      return OK;
    },
    run: (g, q) => bfs(g, q.source),
  },
  dagShortestPath: {
    id: "dagShortestPath",
    label: "Caminho mínimo em DAG",
    shortLabel: "DAG",
    problem: "sssp",
    description: "Ordenação topológica + uma relaxação por arco. Aceita pesos negativos.",
    complexity: "O(V + E)",
    requirements: "Grafo direcionado e acíclico.",
    expansionDefinition: "Expansão = vértice com distância finita processado na ordem topológica.",
    check: (a, q) => {
      const base = needsSource(q, a);
      if (base) return base;
      if (a.undirectedEdges > 0) {
        return { ok: false, reason: "Há arestas não direcionadas: cada uma forma um ciclo (u → v → u), então não é um DAG." };
      }
      if (!a.isDag) {
        return { ok: false, reason: `O grafo tem ciclo dirigido (${(a.cycleExample?.length ?? 0)} vértices), então não é um DAG.` };
      }
      return OK;
    },
    run: (g, q) => dagShortestPath(g, q.source),
  },
  duanSssp: {
    id: "duanSssp",
    label: "Duan et al. (2025)",
    shortLabel: "Duan '25",
    problem: "sssp",
    description: "\"Breaking the Sorting Barrier\": recursão BMSSP que evita ordenar todos os vértices.",
    complexity: "O(m log²ᐟ³ n)",
    requirements: `Pesos ≥ 0; até ${DUAN_MAX_VERTICES.toLocaleString("pt-BR")} vértices.`,
    experimental:
      "Implementação experimental: segue a lógica do artigo, mas sem as estruturas de dados que garantem o limite teórico. Espere tempos muito maiores que os do Dijkstra; o interesse é comparar teoria e prática.",
    expansionDefinition:
      "Expansão = vértice do grafo TRANSFORMADO (grau ≤ 2, uma \"porta\" por vizinho) cujos arcos de saída foram percorridos, somando FindPivots, BaseCase e BMSSP — um vértice pode ser expandido mais de uma vez.",
    check: (a, q) => {
      const base = needsSource(q, a) ?? noNegative(a, "o algoritmo de Duan et al.");
      if (base) return base;
      if (a.n > DUAN_MAX_VERTICES) {
        return { ok: false, reason: `${a.n} vértices: acima do limite de ${DUAN_MAX_VERTICES} desta implementação experimental.` };
      }
      return OK;
    },
    run: (g, q) => runDuan(g, q.source),
  },
  dijkstraTarget: {
    id: "dijkstraTarget",
    label: "Dijkstra até o destino",
    shortLabel: "Dijkstra→t",
    problem: "p2p",
    description: "Dijkstra que para ao fixar o destino: referência justa para A* e bidirecional.",
    complexity: "O((V + E) log V)",
    requirements: "Pesos ≥ 0 e um destino.",
    expansionDefinition: HEAP_EXPANSION,
    check: (a, q) => needsSource(q, a) ?? needsTarget(q) ?? noNegative(a, "o Dijkstra") ?? OK,
    run: (g, q) => dijkstraToTarget(g, q.source, q.target!),
  },
  astar: {
    id: "astar",
    label: "A*",
    shortLabel: "A*",
    problem: "p2p",
    description:
      "Custo acumulado + heurística euclidiana pelas posições no editor, calibrada para nunca superestimar.",
    complexity: "O((V + E) log V) no pior caso",
    requirements: "Pesos ≥ 0 e um destino. A heurística é ajustada aos pesos (admissível e consistente).",
    expansionDefinition: HEAP_EXPANSION,
    check: (a, q) => needsSource(q, a) ?? needsTarget(q) ?? noNegative(a, "o A*") ?? OK,
    run: (g, q) => astar(g, q.source, q.target!),
  },
  bidirectionalDijkstra: {
    id: "bidirectionalDijkstra",
    label: "Dijkstra bidirecional",
    shortLabel: "Bidirecional",
    problem: "p2p",
    description: "Duas buscas (da origem e do destino, pelos arcos reversos) que param ao se encontrar.",
    complexity: "O((V + E) log V)",
    requirements: "Pesos ≥ 0 e um destino.",
    expansionDefinition: "Expansão = vértice fixado em qualquer uma das duas buscas (soma das frentes).",
    check: (a, q) => needsSource(q, a) ?? needsTarget(q) ?? noNegative(a, "o Dijkstra bidirecional") ?? OK,
    run: (g, q) => bidirectionalDijkstra(g, q.source, q.target!),
  },
  floydWarshall: {
    id: "floydWarshall",
    label: "Floyd-Warshall",
    shortLabel: "Floyd-W.",
    problem: "apsp",
    description: "Programação dinâmica sobre vértices intermediários; todos os pares, aceita pesos negativos.",
    complexity: "O(V³) tempo, O(V²) memória",
    requirements: `Até ${APSP_LIMITS.floydWarshall} vértices. Detecta ciclo negativo.`,
    expansionDefinition: "Expansão = vértice intermediário processado (= V); arcos examinados = comparações da matriz.",
    check: (a, q) => {
      const base = needsSource(q, a);
      if (base) return base;
      if (a.n > APSP_LIMITS.floydWarshall) {
        return {
          ok: false,
          reason: `${a.n} vértices: O(V³) ≈ ${(a.n ** 3 / 1e9).toFixed(1)} bilhão de passos; limite de ${APSP_LIMITS.floydWarshall} vértices.`,
        };
      }
      return a.negativeCycle.status === "found"
        ? { ok: true, note: "Há ciclo negativo: o algoritmo vai detectá-lo e as distâncias afetadas serão −∞." }
        : OK;
    },
    run: (g) => floydWarshall(g),
  },
  johnson: {
    id: "johnson",
    label: "Johnson",
    shortLabel: "Johnson",
    problem: "apsp",
    description: "Bellman-Ford para repesar + um Dijkstra por vértice; todos os pares em grafos esparsos.",
    complexity: "O(V·E·log V)",
    requirements: `Sem ciclo negativo; até ${APSP_LIMITS.johnson} vértices (matriz V×V).`,
    expansionDefinition: "Expansão = vértice fixado, somando os V Dijkstras (o Bellman-Ford inicial conta em arcos examinados).",
    check: (a, q) => {
      const base = needsSource(q, a);
      if (base) return base;
      if (a.n > APSP_LIMITS.johnson) {
        return { ok: false, reason: `${a.n} vértices: a matriz V×V excede o limite de ${APSP_LIMITS.johnson} vértices.` };
      }
      if (a.negativeCycle.status === "found") {
        return { ok: false, reason: `Johnson exige ausência de ciclo negativo${cycleText(a)}.` };
      }
      return OK;
    },
    run: (g) => johnson(g),
  },
};

export const GRAPH_ALGORITHM_IDS = Object.keys(GRAPH_ALGORITHMS) as GraphAlgorithmId[];

export const PROBLEM_LABELS: Record<ProblemKind, { title: string; description: string }> = {
  sssp: {
    title: "Origem única",
    description: "Distâncias da origem para todos os vértices.",
  },
  p2p: {
    title: "Origem → destino",
    description: "Distância e caminho até um destino; podem parar antes de explorar tudo.",
  },
  apsp: {
    title: "Todos os pares",
    description: "Distâncias entre todos os pares de vértices (V×V).",
  },
};

/** Rótulos e definições das contagens específicas (`counters.extra`). */
export const GRAPH_OPERATION_LABELS: Record<string, { label: string; title: string }> = {
  heapPushes: { label: "Inserções na heap", title: "Itens inseridos na fila de prioridade." },
  heapPops: { label: "Remoções da heap", title: "Itens retirados, incluindo entradas obsoletas descartadas." },
  rounds: { label: "Rodadas", title: "Passagens completas pelos arcos (no máximo V−1)." },
  earlyStop: { label: "Parada antecipada", title: "1 se uma rodada inteira não mudou nenhuma distância." },
  enqueues: { label: "Inserções na fila", title: "Vértices colocados na fila FIFO." },
  topoSortedVertices: { label: "Vértices ordenados", title: "Vértices na ordenação topológica." },
  matrixCells: { label: "Células da matriz", title: "Tamanho da matriz de distâncias (V²)." },
  bellmanFordRounds: { label: "Rodadas do Bellman-Ford", title: "Rodadas para calcular os potenciais." },
  dijkstraRuns: { label: "Execuções do Dijkstra", title: "Uma por vértice de origem." },
  transformedVertices: { label: "Vértices transformados", title: "Portas criadas pela transformação para grau constante (uma por vizinho)." },
  transformedArcs: { label: "Arcos transformados", title: "Arcos originais + ciclos de peso 0 entre as portas de cada vértice." },
  recursionCalls: { label: "Chamadas BMSSP", title: "Chamadas recursivas do BMSSP (incluindo os casos base)." },
  pulls: { label: "Pulls", title: "Extrações de lote da estrutura de ordenação parcial (Lemma 3.3)." },
};
