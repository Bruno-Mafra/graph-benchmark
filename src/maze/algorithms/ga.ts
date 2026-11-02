import type { MazeGrid } from "../model";
import type { MazeSearchContext, MazeSearchOutput } from "./types";
import { pathCostOf, searchOutput } from "./gridUtils";
import { PathScratch, randomRoute, removeLoops, shortcutPath } from "./pathOps";

type Individual = { path: number[]; cost: number; hash: number };

const ELITE = 2;
const TOURNAMENT = 3;

function hashPath(path: number[]): number {
  let h = 2166136261;
  for (const c of path) h = Math.imul(h ^ c, 16777619);
  return h >>> 0;
}

/**
 * Algoritmo Genético para caminho em grid.
 *
 * - Indivíduo = rota VÁLIDA do início ao destino (lista de células ortogonalmente
 *   adjacentes, sem obstáculos). A população inicial vem de DFS aleatórias
 *   enviesadas para o destino (`randomRoute`); todo operador preserva validade.
 * - Aptidão = custo da rota (menor é melhor).
 * - Seleção por torneio (3); elitismo dos 2 melhores.
 * - Crossover: escolhe uma célula comum aos pais e une o prefixo de um ao
 *   sufixo do outro; ciclos são removidos.
 * - Mutação: substitui um trecho da rota por um desvio aleatório entre duas
 *   células dela (DFS aleatória limitada).
 * - Diversidade: filhos idênticos a um já presente na nova geração são trocados
 *   por imigrantes aleatórios (até 10% da população por geração).
 * - Parada: número máximo de gerações ou `stagnationLimit` gerações seguidas
 *   sem melhorar a melhor rota (0 = desativado).
 *
 * Expansões = células visitadas pelas DFS aleatórias que constroem rotas
 * (população inicial, mutações e imigrantes).
 */
export function gaGrid(grid: MazeGrid, ctx: MazeSearchContext): MazeSearchOutput {
  const { rng, params } = ctx;
  const popSize = params.populationSize;
  const generations = params.generations;
  const crossoverRate = params.crossoverRate;
  const mutationRate = params.mutationRate;
  const stagnationLimit = params.stagnationLimit;

  const total = grid.size * grid.size;
  const start = grid.start!;
  const goal = grid.goal!;
  const scratch = new PathScratch(total);
  const explored = new Uint8Array(total);

  let nodeExpansions = 0;
  let fitnessEvaluations = 0;
  let crossovers = 0;
  let mutations = 0;
  let immigrants = 0;
  let generationsRun = 0;

  const onEnter = (cell: number) => {
    explored[cell] = 1;
    nodeExpansions++;
  };
  const makeIndividual = (path: number[]): Individual => {
    const clean = shortcutPath(grid, removeLoops(path, scratch), scratch);
    fitnessEvaluations++;
    return { path: clean, cost: pathCostOf(grid, clean), hash: hashPath(clean) };
  };
  const randomIndividual = (): Individual | null => {
    const route = randomRoute(grid, start, goal, rng, scratch, Infinity, onEnter);
    return route ? makeIndividual(route) : null;
  };

  const first = randomIndividual();
  explored[start] = 1;
  if (!first) {
    return searchOutput(grid, null, explored, nodeExpansions, {
      generationsRun,
      fitnessEvaluations,
      crossovers,
      mutations,
      immigrants,
    });
  }
  let population: Individual[] = [first];
  while (population.length < popSize) population.push(randomIndividual()!);

  const byCost = (a: Individual, b: Individual) => a.cost - b.cost || a.path.length - b.path.length;
  population.sort(byCost);
  let best = population[0];
  let stagnant = 0;

  const tournament = (): Individual => {
    let winner = population[Math.floor(rng() * population.length)];
    for (let k = 1; k < TOURNAMENT; k++) {
      const other = population[Math.floor(rng() * population.length)];
      if (byCost(other, winner) < 0) winner = other;
    }
    return winner;
  };

  const crossover = (a: number[], b: number[]): number[] => {
    for (let j = 1; j < b.length - 1; j++) scratch.pos[b[j]] = j;
    const common: number[] = [];
    for (let i = 1; i < a.length - 1; i++) if (scratch.pos[a[i]] !== -1) common.push(i);
    let child = a;
    if (common.length > 0) {
      const i = common[Math.floor(rng() * common.length)];
      const j = scratch.pos[a[i]];
      child = a.slice(0, i).concat(b.slice(j));
    }
    for (let j = 1; j < b.length - 1; j++) scratch.pos[b[j]] = -1;
    return child;
  };

  const mutate = (path: number[]): number[] => {
    if (path.length < 3) return path;
    const maxSeg = Math.max(4, Math.floor(path.length / 4));
    const i = Math.floor(rng() * (path.length - 2));
    const j = Math.min(path.length - 1, i + 2 + Math.floor(rng() * maxSeg));
    const detour = randomRoute(grid, path[i], path[j], rng, scratch, 8 * (j - i) + 32, onEnter);
    if (!detour) return path;
    return path.slice(0, i).concat(detour, path.slice(j + 1));
  };

  for (let gen = 0; gen < generations; gen++) {
    generationsRun++;
    const next: Individual[] = population.slice(0, Math.min(ELITE, population.length));
    const seen = new Set(next.map((ind) => ind.hash));
    let immigrantsLeft = Math.max(1, Math.floor(popSize * 0.1));

    while (next.length < popSize) {
      const p1 = tournament();
      let childPath = p1.path;
      if (rng() < crossoverRate) {
        crossovers++;
        childPath = crossover(p1.path, tournament().path);
      }
      if (rng() < mutationRate) {
        mutations++;
        childPath = mutate(childPath);
      }
      let child =
        childPath === p1.path ? p1 : makeIndividual(childPath);
      if (seen.has(child.hash) && immigrantsLeft > 0) {
        immigrantsLeft--;
        immigrants++;
        child = randomIndividual()!;
      }
      seen.add(child.hash);
      next.push(child);
    }

    next.sort(byCost);
    population = next;
    if (byCost(population[0], best) < 0) {
      best = population[0];
      stagnant = 0;
    } else if (stagnationLimit > 0 && ++stagnant >= stagnationLimit) {
      break;
    }
  }

  return searchOutput(grid, best.path, explored, nodeExpansions, {
    generationsRun,
    fitnessEvaluations,
    crossovers,
    mutations,
    immigrants,
  });
}
