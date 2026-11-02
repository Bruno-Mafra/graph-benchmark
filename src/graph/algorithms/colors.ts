import type { GraphAlgorithmId } from "./types";

/** Cor estável por algoritmo (cartões, tabela, gráficos e caminho destacado). */
export const GRAPH_ALGORITHM_COLORS: Record<GraphAlgorithmId, string> = {
  dijkstra: "#5b8cff",
  bellmanFord: "#e8a54b",
  bfs: "#2dd4bf",
  dagShortestPath: "#a3e635",
  dijkstraTarget: "#93b4ff",
  astar: "#c084fc",
  bidirectionalDijkstra: "#f472b6",
  floydWarshall: "#fb923c",
  johnson: "#facc15",
  duanSssp: "#38bdf8",
};
