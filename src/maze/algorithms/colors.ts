import type { MazeAlgorithmId } from "./types";

/** Cor estável por algoritmo (cartões, tabela e gráficos). */
export const MAZE_ALGORITHM_COLORS: Record<MazeAlgorithmId, string> = {
  dijkstra: "#5b8cff",
  bfs: "#2dd4bf",
  bidirectionalBfs: "#a3e635",
  astar: "#c084fc",
  greedy: "#f472b6",
  aco: "#fb923c",
  ga: "#e8a54b",
};
