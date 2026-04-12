import type { Graph } from "../algorithms/types";

/** Verdadeiro se alguma aresta tem peso estritamente negativo. */
export function graphHasNegativeEdge(graph: Graph): boolean {
  for (const adj of graph) {
    for (const e of adj) {
      if (e.weight < 0) return true;
    }
  }
  return false;
}
