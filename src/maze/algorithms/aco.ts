import type { MazeGrid } from "../model";
import type { MazeSearchContext, MazeSearchOutput } from "./types";
import { manhattan, minStepCost, pathCostOf, searchOutput } from "./gridUtils";
import { PathScratch, shortcutPath } from "./pathOps";

const TAU_INITIAL = 1;
const TAU_MIN = 0.01;
const TAU_MAX = 10;

/** Direção u → v: 0 cima, 1 baixo, 2 esquerda, 3 direita. */
function dirIndex(size: number, u: number, v: number): number {
  const d = v - u;
  return d === -size ? 0 : d === size ? 1 : d === -1 ? 2 : 3;
}

/**
 * Ant Colony Optimization para caminho em grid.
 *
 * - Feromônio por aresta direcionada (célula × 4 direções), começa em 1.
 * - Cada formiga parte do início e, a cada passo, sorteia uma vizinha NÃO
 *   visitada com probabilidade ∝ τ^α · η^β, com η = 1 / (Manhattan até o destino + 1).
 * - Sem saída, a formiga retrocede (desfaz o último passo). Como nunca revisita
 *   células, a rota é sempre simples (sem ciclos) e válida; se a formiga esgota
 *   tudo sem achar o destino, ele é inalcançável e a busca termina.
 * - Rotas encontradas passam por um atalho local (`shortcutPath`).
 * - Ao fim de cada iteração: evaporação τ ← (1-ρ)·τ, depósito Q/custo pelas
 *   formigas que chegaram e reforço elitista da melhor rota global
 *   (τ limitado a [0,01; 10]).
 *
 * Expansões = células em que alguma formiga entrou (somando todas as formigas
 * e iterações; uma célula pode contar várias vezes).
 */
export function acoGrid(grid: MazeGrid, ctx: MazeSearchContext): MazeSearchOutput {
  const { rng, params } = ctx;
  const ants = params.ants;
  const iterations = params.iterations;
  const rho = params.evaporation;
  const alpha = params.alpha;
  const beta = params.beta;

  const { size, walls } = grid;
  const total = size * size;
  const start = grid.start!;
  const goal = grid.goal!;
  const tau = new Float32Array(total * 4).fill(TAU_INITIAL);
  const explored = new Uint8Array(total);
  const scratch = new PathScratch(total);
  // η^β por célula, calculado sob demanda.
  const etaPow = new Float64Array(total).fill(-1);
  const deposit = Math.max(1e-9, manhattan(size, start, goal) * minStepCost(grid));

  let nodeExpansions = 0;
  let antsLaunched = 0;
  let antsArrived = 0;
  let backtracks = 0;
  let pheromoneDeposits = 0;
  let iterationsRun = 0;

  let best: number[] | null = null;
  let bestCost = Infinity;
  const cand = new Int32Array(4);
  const weight = new Float64Array(4);

  outer: for (let it = 0; it < iterations; it++) {
    iterationsRun++;
    const arrived: { path: number[]; cost: number }[] = [];

    for (let a = 0; a < ants; a++) {
      antsLaunched++;
      const mark = scratch.nextMark();
      const stack = scratch.stack;
      let top = 0;
      stack[top++] = start;
      scratch.stamp[start] = mark;

      while (top > 0 && stack[top - 1] !== goal) {
        const u = stack[top - 1];
        const r = Math.floor(u / size);
        const c = u - r * size;
        let count = 0;
        let sum = 0;
        for (let d = 0; d < 4; d++) {
          let v: number;
          if (d === 0) {
            if (r === 0) continue;
            v = u - size;
          } else if (d === 1) {
            if (r === size - 1) continue;
            v = u + size;
          } else if (d === 2) {
            if (c === 0) continue;
            v = u - 1;
          } else {
            if (c === size - 1) continue;
            v = u + 1;
          }
          if (walls[v] === 1 || scratch.stamp[v] === mark) continue;
          let e = etaPow[v];
          if (e < 0) {
            e = Math.pow(1 / (manhattan(size, v, goal) + 1), beta);
            etaPow[v] = e;
          }
          const t = tau[u * 4 + d];
          const w = (alpha === 1 ? t : Math.pow(t, alpha)) * e;
          cand[count] = v;
          weight[count++] = w;
          sum += w;
        }

        if (count === 0) {
          top--;
          backtracks++;
          continue;
        }
        let chosen = cand[count - 1];
        let pick = rng() * sum;
        for (let k = 0; k < count; k++) {
          pick -= weight[k];
          if (pick < 0) {
            chosen = cand[k];
            break;
          }
        }
        scratch.stamp[chosen] = mark;
        stack[top++] = chosen;
        explored[chosen] = 1;
        nodeExpansions++;
      }

      if (top === 0) {
        // A formiga percorreu toda a região alcançável: não há caminho.
        break outer;
      }
      antsArrived++;
      const path = shortcutPath(grid, Array.from(stack.subarray(0, top)), scratch);
      const cost = pathCostOf(grid, path);
      arrived.push({ path, cost });
      if (cost < bestCost) {
        bestCost = cost;
        best = path;
      }
    }

    for (let i = 0; i < tau.length; i++) {
      const t = tau[i] * (1 - rho);
      tau[i] = t < TAU_MIN ? TAU_MIN : t;
    }
    const reinforce = (path: number[], amount: number) => {
      for (let k = 1; k < path.length; k++) {
        const i = path[k - 1] * 4 + dirIndex(size, path[k - 1], path[k]);
        const t = tau[i] + amount;
        tau[i] = t > TAU_MAX ? TAU_MAX : t;
        pheromoneDeposits++;
      }
    };
    for (const ant of arrived) reinforce(ant.path, deposit / Math.max(ant.cost, 1e-9));
    if (best) reinforce(best, deposit / Math.max(bestCost, 1e-9));
  }

  explored[start] = 1;
  return searchOutput(grid, best, explored, nodeExpansions, {
    iterationsRun,
    antsLaunched,
    antsArrived,
    backtracks,
    pheromoneDeposits,
  });
}
