import { applyCellEdit, clearWalls, createEmptyMaze } from "./model";
import type { MazeEditMode, MazeGrid } from "./model";
import type { MazeAlgorithmId, MazeSolveResult } from "./algorithms/types";

/**
 * - `auto`: lado a lado se houver mais de um resultado, senão individual;
 * - `grid`: todos os caminhos em miniaturas;
 * - `single`: um algoritmo em tamanho grande (`selectedId`).
 */
export type ResultsView = "auto" | "grid" | "single";

/**
 * Estado da aba: a instância do labirinto e os resultados calculados SOBRE ela.
 * Qualquer alteração no grid descarta os resultados, para nunca exibir um
 * caminho que não corresponde ao labirinto atual. Executar algoritmos não altera
 * o grid, então as comparações usam exatamente a mesma instância.
 */
export type MazeState = {
  grid: MazeGrid;
  results: MazeSolveResult[];
  selectedId: MazeAlgorithmId | null;
  view: ResultsView;
};

export type MazeAction =
  | { type: "editCell"; mode: MazeEditMode; index: number }
  | { type: "clearWalls" }
  | { type: "reset"; size: number }
  | { type: "load"; grid: MazeGrid }
  /** Início de uma nova execução comparativa: descarta resultados anteriores. */
  | { type: "startRun" }
  | { type: "addResult"; result: MazeSolveResult }
  | { type: "setResults"; results: MazeSolveResult[] }
  | { type: "clearResults" }
  /** Só muda o que é exibido; nunca reexecuta nem altera resultados. */
  | { type: "selectResult"; algorithmId: MazeAlgorithmId }
  | { type: "setView"; view: ResultsView };

function withGrid(grid: MazeGrid): MazeState {
  return { grid, results: [], selectedId: null, view: "auto" };
}

export function initMazeState(size: number): MazeState {
  return withGrid(createEmptyMaze(size));
}

export function mazeReducer(state: MazeState, action: MazeAction): MazeState {
  switch (action.type) {
    case "editCell": {
      const grid = applyCellEdit(state.grid, action.mode, action.index);
      return grid === state.grid ? state : withGrid(grid);
    }
    case "clearWalls":
      return withGrid(clearWalls(state.grid));
    case "reset":
      return initMazeState(action.size);
    case "load":
      return withGrid(action.grid);
    case "startRun":
    case "clearResults":
      return state.results.length === 0 && state.selectedId === null && state.view === "auto"
        ? state
        : withGrid(state.grid);
    case "addResult": {
      const results = [
        ...state.results.filter((r) => r.algorithmId !== action.result.algorithmId),
        action.result,
      ];
      return { ...state, results, selectedId: state.selectedId ?? action.result.algorithmId };
    }
    case "setResults":
      return {
        ...state,
        results: action.results,
        selectedId: action.results[0]?.algorithmId ?? null,
      };
    case "selectResult":
      return { ...state, selectedId: action.algorithmId, view: "single" };
    case "setView":
      return { ...state, view: action.view };
  }
}

/** Visualização efetiva, resolvendo o modo `auto`. */
export function effectiveView(state: MazeState): "grid" | "single" {
  if (state.view !== "auto") return state.view;
  return state.results.length > 1 ? "grid" : "single";
}
