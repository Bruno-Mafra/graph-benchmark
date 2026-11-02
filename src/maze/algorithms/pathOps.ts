import type { MazeGrid } from "../model";
import { manhattan, openNeighbors } from "./gridUtils";

/**
 * Estruturas auxiliares reaproveitadas durante uma execução de ACO/GA
 * (evita alocar arrays do tamanho do grid a cada rota).
 */
export class PathScratch {
  /** Posição da célula na rota corrente; -1 = ausente. Sempre volta a -1 após o uso. */
  readonly pos: Int32Array;
  /** Marcação de visitadas por "carimbo" (incrementa a cada busca). */
  readonly stamp: Int32Array;
  readonly stack: Int32Array;
  readonly nb = new Int32Array(4);
  private mark = 0;

  constructor(total: number) {
    this.pos = new Int32Array(total).fill(-1);
    this.stamp = new Int32Array(total);
    this.stack = new Int32Array(total);
  }

  nextMark(): number {
    this.mark++;
    return this.mark;
  }
}

/** Remove ciclos: ao revisitar uma célula, descarta o trecho entre as duas visitas. */
export function removeLoops(path: number[], s: PathScratch): number[] {
  const out: number[] = [];
  for (const cell of path) {
    const p = s.pos[cell];
    if (p !== -1) {
      for (let k = p + 1; k < out.length; k++) s.pos[out[k]] = -1;
      out.length = p + 1;
    } else {
      s.pos[cell] = out.length;
      out.push(cell);
    }
  }
  for (const cell of out) s.pos[cell] = -1;
  return out;
}

/**
 * Refinamento local: se uma célula da rota é vizinha de outra mais adiante,
 * pula direto para ela (remove desvios). Com custos positivos, nunca piora a rota.
 * A rota deve ser simples (sem células repetidas).
 */
export function shortcutPath(grid: MazeGrid, path: number[], s: PathScratch): number[] {
  if (path.length < 3) return path.slice();
  for (let i = 0; i < path.length; i++) s.pos[path[i]] = i;
  const out = [path[0]];
  let i = 0;
  while (i < path.length - 1) {
    let next = i + 1;
    const n = openNeighbors(grid, path[i], s.nb);
    for (let k = 0; k < n; k++) {
      const p = s.pos[s.nb[k]];
      if (p > next) next = p;
    }
    i = next;
    out.push(path[i]);
  }
  for (const cell of path) s.pos[cell] = -1;
  return out;
}

/**
 * Rota aleatória de `from` até `to` por DFS aleatória com retrocesso: a
 * próxima célula é sorteada entre vizinhas não visitadas, com peso 3 para as
 * que se aproximam de `to` (Manhattan) e 1 para as demais. Retorna uma rota
 * simples válida, ou `null` se `to` é inalcançável ou se excedeu `maxSteps`
 * movimentos para frente. `onEnter` é chamado a cada célula visitada.
 */
export function randomRoute(
  grid: MazeGrid,
  from: number,
  to: number,
  rng: () => number,
  s: PathScratch,
  maxSteps: number,
  onEnter: (cell: number) => void
): number[] | null {
  const mark = s.nextMark();
  const stack = s.stack;
  const weights = [0, 0, 0, 0];
  let top = 0;
  stack[top++] = from;
  s.stamp[from] = mark;
  let steps = 0;

  while (top > 0) {
    const u = stack[top - 1];
    if (u === to) return Array.from(stack.subarray(0, top));
    const hu = manhattan(grid.size, u, to);
    const n = openNeighbors(grid, u, s.nb);
    let sum = 0;
    let count = 0;
    for (let k = 0; k < n; k++) {
      const v = s.nb[k];
      if (s.stamp[v] === mark) continue;
      const w = manhattan(grid.size, v, to) < hu ? 3 : 1;
      s.nb[count] = v;
      weights[count++] = w;
      sum += w;
    }
    if (count === 0) {
      top--;
      continue;
    }
    if (++steps > maxSteps) return null;
    let pick = rng() * sum;
    let chosen = s.nb[count - 1];
    for (let k = 0; k < count; k++) {
      pick -= weights[k];
      if (pick < 0) {
        chosen = s.nb[k];
        break;
      }
    }
    s.stamp[chosen] = mark;
    stack[top++] = chosen;
    onEnter(chosen);
  }
  return null;
}
