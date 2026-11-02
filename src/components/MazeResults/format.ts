import type { OptimalityVerdict } from "../../maze/algorithms/stats";

export const fmtInt = (n: number) => Math.round(n).toLocaleString("pt-BR");

export function fmtNumber(n: number, digits = 2): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
}

/** Tempo em ms com casas suficientes para valores pequenos. */
export function fmtMs(ms: number): string {
  if (ms >= 100) return `${fmtNumber(ms, 1)} ms`;
  if (ms >= 1) return `${fmtNumber(ms, 2)} ms`;
  return `${fmtNumber(ms, 4)} ms`;
}

export function fmtGap(gap: number | null): string {
  if (gap == null) return "—";
  return gap === 0 ? "0%" : `+${fmtNumber(gap, 1)}%`;
}

export const VERDICT_LABELS: Record<OptimalityVerdict, { label: string; title: string; color: string }> = {
  guaranteed: {
    label: "Ótimo (garantido)",
    title: "O algoritmo garante o caminho de menor custo nestas condições.",
    color: "#86efac",
  },
  "observed-optimal": {
    label: "Ótimo nesta execução",
    title: "Atingiu o custo do Dijkstra, mas o algoritmo não garante isso em geral.",
    color: "#a8c4ff",
  },
  suboptimal: {
    label: "Subótimo",
    title: "Custo maior que o ótimo de referência (Dijkstra).",
    color: "#fbbf24",
  },
  unknown: {
    label: "Sem garantia",
    title: "Sem garantia teórica e sem referência do Dijkstra para comparar.",
    color: "#9a9aa8",
  },
  "no-path": {
    label: "—",
    title: "Nenhum caminho encontrado.",
    color: "#9a9aa8",
  },
};
