import type { AlgorithmParams, ParamSpec } from "./types";

/** Quantidade de execuções independentes (só para algoritmos estocásticos). */
export const RUNS_PARAM: ParamSpec = {
  key: "runs",
  label: "Execuções",
  help: "Repete o algoritmo no mesmo labirinto com sementes diferentes, para medir a variabilidade.",
  min: 1,
  max: 50,
  step: 1,
  integer: true,
  default: 5,
};

export const ACO_PARAMS: ParamSpec[] = [
  {
    key: "ants",
    label: "Formigas",
    help: "Formigas por iteração. Mais formigas exploram mais rotas, mas cada iteração fica mais cara.",
    min: 1,
    max: 200,
    step: 1,
    integer: true,
    default: 20,
  },
  {
    key: "iterations",
    label: "Iterações",
    help: "Critério de parada: rodadas de construção de rotas + atualização de feromônio.",
    min: 1,
    max: 500,
    step: 1,
    integer: true,
    default: 30,
  },
  {
    key: "evaporation",
    label: "Evaporação (ρ)",
    help: "Fração do feromônio perdida a cada iteração. Alta = esquece rápido (explora); baixa = converge rápido.",
    min: 0.01,
    max: 0.99,
    step: 0.01,
    integer: false,
    default: 0.3,
  },
  {
    key: "alpha",
    label: "Influência do feromônio (α)",
    help: "Peso do feromônio na escolha do próximo passo. 0 ignora o aprendizado da colônia.",
    min: 0,
    max: 5,
    step: 0.1,
    integer: false,
    default: 1,
  },
  {
    key: "beta",
    label: "Influência da heurística (β)",
    help: "Peso da proximidade do destino (Manhattan). Alto = formigas mais gulosas.",
    min: 0,
    max: 10,
    step: 0.1,
    integer: false,
    default: 3,
  },
  RUNS_PARAM,
];

export const GA_PARAMS: ParamSpec[] = [
  {
    key: "populationSize",
    label: "População",
    help: "Rotas mantidas por geração. Maior = mais diversidade e mais custo por geração.",
    min: 4,
    max: 300,
    step: 1,
    integer: true,
    default: 30,
  },
  {
    key: "generations",
    label: "Gerações (máx.)",
    help: "Critério de parada principal: número máximo de gerações.",
    min: 1,
    max: 1000,
    step: 1,
    integer: true,
    default: 80,
  },
  {
    key: "crossoverRate",
    label: "Taxa de crossover",
    help: "Probabilidade de combinar dois pais em um ponto comum das rotas.",
    min: 0,
    max: 1,
    step: 0.05,
    integer: false,
    default: 0.8,
  },
  {
    key: "mutationRate",
    label: "Taxa de mutação",
    help: "Probabilidade de trocar um trecho da rota por um desvio aleatório.",
    min: 0,
    max: 1,
    step: 0.05,
    integer: false,
    default: 0.3,
  },
  {
    key: "stagnationLimit",
    label: "Parada por estagnação",
    help: "Para após N gerações seguidas sem melhorar a melhor rota (0 = desativado).",
    min: 0,
    max: 1000,
    step: 1,
    integer: true,
    default: 25,
  },
  RUNS_PARAM,
];

export function defaultParams(specs: ParamSpec[]): AlgorithmParams {
  return Object.fromEntries(specs.map((s) => [s.key, s.default]));
}

export type ParamValidation = {
  params: AlgorithmParams;
  /** chave → mensagem; vazio quando tudo é válido. */
  errors: Record<string, string>;
};

/** Valida valores digitados (strings ou números) contra as especificações. */
export function validateParams(
  specs: ParamSpec[],
  values: Record<string, string | number | undefined>
): ParamValidation {
  const params: AlgorithmParams = {};
  const errors: Record<string, string> = {};
  for (const spec of specs) {
    const raw = values[spec.key];
    const n = raw === undefined || raw === "" ? spec.default : Number(raw);
    if (!Number.isFinite(n)) {
      errors[spec.key] = "Informe um número.";
    } else if (spec.integer && !Number.isInteger(n)) {
      errors[spec.key] = "Informe um número inteiro.";
    } else if (n < spec.min || n > spec.max) {
      errors[spec.key] = `Use um valor entre ${spec.min} e ${spec.max}.`;
    }
    params[spec.key] = Number.isFinite(n) ? n : spec.default;
  }
  return { params, errors };
}
