/**
 * Gera tabelas (Markdown) e gráficos (SVG) a partir dos dados brutos em
 * docs/experimentos/dados/. Não executa algoritmos.
 *
 * Uso: vite-node scripts/experiments/report.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { GRAPH_ALGORITHMS } from "../../src/graph/algorithms/registry";
import { GRAPH_ALGORITHM_COLORS } from "../../src/graph/algorithms/colors";
import { MAZE_ALGORITHMS } from "../../src/maze/algorithms/registry";
import { MAZE_ALGORITHM_COLORS } from "../../src/maze/algorithms/colors";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = any;

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const dir = path.join(root, "docs/experimentos");
const figDir = path.join(dir, "figuras");
mkdirSync(figDir, { recursive: true });
const graph = JSON.parse(readFileSync(path.join(dir, "dados/grafos.json"), "utf8"));
const maze = JSON.parse(readFileSync(path.join(dir, "dados/labirintos.json"), "utf8"));
const G: Row[] = graph.results;
const M: Row[] = maze.results;

// ------------------------------------------------------------------ formatação

const nf = (v: number, d = 2) => v.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: 0 });
function ms(v: number): string {
  if (v >= 100) return `${nf(v, 0)} ms`;
  if (v >= 1) return `${nf(v, 2)} ms`;
  if (v >= 0.01) return `${nf(v, 3)} ms`;
  return `${nf(v * 1000, 2)} µs`;
}
const int = (v: number) => Math.round(v).toLocaleString("pt-BR");
const dist = (v: number | null) => (v == null ? "—" : v === Infinity ? "∞" : v === -Infinity ? "−∞" : nf(v, 4));
const gLabel = (id: string) => (GRAPH_ALGORITHMS as any)[id].label as string;
const mLabel = (id: string) => (MAZE_ALGORITHMS as any)[id].label as string;

function table(header: string[], rows: (string | number)[][], align?: ("l" | "r")[]): string {
  const a = align ?? header.map((_, i) => (i === 0 ? "l" : "r"));
  return [
    `| ${header.join(" | ")} |`,
    `| ${a.map((x) => (x === "r" ? "---:" : ":---")).join(" | ")} |`,
    ...rows.map((r) => `| ${r.join(" | ")} |`),
  ].join("\n");
}

// ------------------------------------------------------------------ SVG

type Series = { label: string; color: string; points: Array<[number, number]>; dashed?: boolean };

function niceLogTicks(min: number, max: number): number[] {
  const out: number[] = [];
  for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) out.push(10 ** e);
  return out;
}

function lineChart(file: string, title: string, xLabel: string, yLabel: string, series: Series[], opts: { logX?: boolean; logY?: boolean; yFormat?: (v: number) => string; xFormat?: (v: number) => string } = {}) {
  const W = 760, H = 430, L = 78, R = 200, T = 40, B = 56;
  const pts = series.flatMap((s) => s.points).filter(([x, y]) => (!opts.logX || x > 0) && (!opts.logY || y > 0));
  if (pts.length === 0) return;
  let [x0, x1] = [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))];
  let [y0, y1] = [Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1]))];
  if (opts.logY) [y0, y1] = [10 ** Math.floor(Math.log10(y0)), 10 ** Math.ceil(Math.log10(y1))];
  else [y0, y1] = [0, y1 * 1.08];
  if (opts.logX) [x0, x1] = [x0 / 1.15, x1 * 1.15];
  const fx = (x: number) => L + ((opts.logX ? Math.log10(x) - Math.log10(x0) : x - x0) / (opts.logX ? Math.log10(x1) - Math.log10(x0) : x1 - x0 || 1)) * (W - L - R);
  const fy = (y: number) => H - B - ((opts.logY ? Math.log10(y) - Math.log10(y0) : y - y0) / (opts.logY ? Math.log10(y1) - Math.log10(y0) : y1 - y0 || 1)) * (H - T - B);
  const yTicks = opts.logY ? niceLogTicks(y0, y1) : Array.from({ length: 6 }, (_, i) => y0 + ((y1 - y0) * i) / 5);
  const xTicks = [...new Set(pts.map((p) => p[0]))].sort((a, b) => a - b);
  const yF = opts.yFormat ?? ((v: number) => nf(v, 3));
  const xF = opts.xFormat ?? ((v: number) => int(v));
  const s: string[] = [];
  s.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui, sans-serif" font-size="12">`);
  s.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
  s.push(`<text x="${L}" y="22" font-size="15" font-weight="700" fill="#111">${title}</text>`);
  for (const t of yTicks) {
    s.push(`<line x1="${L}" x2="${W - R}" y1="${fy(t)}" y2="${fy(t)}" stroke="#e5e7eb"/>`);
    s.push(`<text x="${L - 6}" y="${fy(t) + 4}" text-anchor="end" fill="#444">${yF(t)}</text>`);
  }
  for (const t of xTicks) {
    s.push(`<line x1="${fx(t)}" x2="${fx(t)}" y1="${T}" y2="${H - B}" stroke="#f1f2f4"/>`);
    s.push(`<text x="${fx(t)}" y="${H - B + 16}" text-anchor="middle" fill="#444">${xF(t)}</text>`);
  }
  s.push(`<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#555"/><line x1="${L}" x2="${L}" y1="${T}" y2="${H - B}" stroke="#555"/>`);
  s.push(`<text x="${(L + W - R) / 2}" y="${H - 14}" text-anchor="middle" fill="#222">${xLabel}</text>`);
  s.push(`<text transform="translate(16 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle" fill="#222">${yLabel}</text>`);
  series.forEach((se, i) => {
    const p = se.points.filter(([x, y]) => (!opts.logX || x > 0) && (!opts.logY || y > 0)).sort((a, b) => a[0] - b[0]);
    if (p.length) {
      s.push(`<polyline fill="none" stroke="${se.color}" stroke-width="2.2" ${se.dashed ? 'stroke-dasharray="6 4"' : ""} points="${p.map(([x, y]) => `${fx(x)},${fy(y)}`).join(" ")}"/>`);
      for (const [x, y] of p) s.push(`<circle cx="${fx(x)}" cy="${fy(y)}" r="3.2" fill="${se.color}"/>`);
    }
    const ly = T + 8 + i * 20;
    s.push(`<line x1="${W - R + 14}" x2="${W - R + 36}" y1="${ly}" y2="${ly}" stroke="${se.color}" stroke-width="3" ${se.dashed ? 'stroke-dasharray="6 4"' : ""}/>`);
    s.push(`<text x="${W - R + 42}" y="${ly + 4}" fill="#222">${se.label}</text>`);
  });
  s.push("</svg>");
  writeFileSync(path.join(figDir, file), s.join("\n"));
}

type Bar = { group: string; label: string; color: string; value: number; err?: number; marker?: number };

function barChart(file: string, title: string, yLabel: string, bars: Bar[], yFormat: (v: number) => string) {
  const groups = [...new Set(bars.map((b) => b.group))];
  const labels = [...new Set(bars.map((b) => b.label))];
  const W = 760, H = 400, L = 70, R = 190, T = 40, B = 60;
  const max = Math.max(...bars.map((b) => b.value + (b.err ?? 0)), ...bars.map((b) => b.marker ?? 0)) * 1.12 || 1;
  const gw = (W - L - R) / groups.length;
  const bw = Math.min(36, (gw * 0.8) / labels.length);
  const fy = (v: number) => H - B - (v / max) * (H - T - B);
  const s: string[] = [];
  s.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui, sans-serif" font-size="12">`);
  s.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
  s.push(`<text x="${L}" y="22" font-size="15" font-weight="700" fill="#111">${title}</text>`);
  for (let i = 0; i <= 5; i++) {
    const v = (max * i) / 5;
    s.push(`<line x1="${L}" x2="${W - R}" y1="${fy(v)}" y2="${fy(v)}" stroke="#e5e7eb"/><text x="${L - 6}" y="${fy(v) + 4}" text-anchor="end" fill="#444">${yFormat(v)}</text>`);
  }
  groups.forEach((g, gi) => {
    const inGroup = bars.filter((b) => b.group === g);
    const start = L + gi * gw + (gw - inGroup.length * bw) / 2;
    inGroup.forEach((b, bi) => {
      const x = start + bi * bw;
      s.push(`<rect x="${x}" y="${fy(b.value)}" width="${bw - 3}" height="${H - B - fy(b.value)}" fill="${b.color}"/>`);
      if (b.err) {
        const cx = x + (bw - 3) / 2;
        s.push(`<line x1="${cx}" x2="${cx}" y1="${fy(b.value + b.err)}" y2="${fy(Math.max(0, b.value - b.err))}" stroke="#111"/>`);
        s.push(`<line x1="${cx - 4}" x2="${cx + 4}" y1="${fy(b.value + b.err)}" y2="${fy(b.value + b.err)}" stroke="#111"/>`);
      }
      if (b.marker != null) s.push(`<text x="${x + (bw - 3) / 2}" y="${fy(b.marker) + 4}" text-anchor="middle" font-size="13" fill="#111">◆</text>`);
    });
    s.push(`<text x="${L + gi * gw + gw / 2}" y="${H - B + 18}" text-anchor="middle" fill="#222">${g}</text>`);
  });
  s.push(`<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#555"/>`);
  s.push(`<text transform="translate(16 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle" fill="#222">${yLabel}</text>`);
  labels.forEach((l, i) => {
    const c = bars.find((b) => b.label === l)!.color;
    s.push(`<rect x="${W - R + 14}" y="${T + i * 20}" width="14" height="12" fill="${c}"/><text x="${W - R + 34}" y="${T + i * 20 + 10}" fill="#222">${l}</text>`);
  });
  s.push("</svg>");
  writeFileSync(path.join(figDir, file), s.join("\n"));
}

// ------------------------------------------------------------------ consistência (grafos)

const REF_ORDER = ["dijkstra", "bellmanFord", "dagShortestPath", "bfs", "johnson", "floydWarshall"];
function consistency(scenario: string): Map<string, string> {
  const rows = G.filter((r) => r.scenario === scenario && !r.skipped);
  const ref = REF_ORDER.map((id) => rows.find((r) => r.algorithmId === id && r.digest)).find(Boolean);
  const out = new Map<string, string>();
  for (const r of rows) {
    if (!ref) out.set(r.algorithmId, "—");
    else if (r === ref) out.set(r.algorithmId, "referência");
    else if (r.digest) {
      const a = r.digest, b = ref.digest;
      const ok = a.finite === b.finite && a.inf === b.inf && a.negInf === b.negInf && Math.abs(a.sum - b.sum) <= 1e-6 * Math.max(1, Math.abs(b.sum));
      out.set(r.algorithmId, ok ? "✓" : "✗");
    } else if (r.targetDistance != null) out.set(r.algorithmId, r.targetDistance === ref.targetDistance || Math.abs(r.targetDistance - ref.targetDistance) < 1e-9 ? "✓" : "✗");
    else out.set(r.algorithmId, "—");
  }
  return out;
}

const md: string[] = [];
const h = (t: string) => md.push(`\n### ${t}\n`);

// Tabela detalhada de um cenário de grafo.
function scenarioTable(scenario: string): string {
  const rows = G.filter((r) => r.scenario === scenario);
  const cons = consistency(scenario);
  return table(
    ["Algoritmo", "Status", "Tempo (mediana ± dp)", "Expansões", "Arcos examinados", "Relaxações", "Dist. destino", "Consistência"],
    rows.map((r) =>
      r.skipped
        ? [gLabel(r.algorithmId), `não executado: ${r.skipped}`, "—", "—", "—", "—", "—", "—"]
        : [
            gLabel(r.algorithmId),
            r.status === "ok" ? "válido" : "ciclo negativo",
            `${ms(r.timing.medianMs)} ± ${ms(r.timing.stdMs)}`,
            int(r.expansions),
            int(r.edgeScans),
            int(r.relaxations),
            dist(r.targetDistance),
            cons.get(r.algorithmId) ?? "—",
          ]
    ),
    ["l", "l", "r", "r", "r", "r", "r", "l"]
  );
}

function pivot(experiment: string, metric: (r: Row) => number | null, fmt: (v: number) => string, xName: string, xFmt = int, only?: string[]): string {
  const rows = G.filter((r) => r.experiment === experiment && (!only || only.includes(r.algorithmId)));
  const xs = [...new Set(rows.map((r) => r.x))].sort((a, b) => a - b);
  const ids = [...new Set(rows.map((r) => r.algorithmId))].filter((id) => rows.some((r) => r.algorithmId === id && !r.skipped));
  return table(
    [xName, ...ids.map(gLabel)],
    xs.map((x) => [xFmt(x), ...ids.map((id) => {
      const r = rows.find((q) => q.x === x && q.algorithmId === id);
      if (!r) return "—";
      if (r.skipped) return "n/e";
      const v = metric(r);
      return v == null ? "—" : fmt(v);
    })])
  );
}

function graphSeries(experiment: string, metric: (r: Row) => number, ids?: string[], suffix = "", dashed = false): Series[] {
  const rows = G.filter((r) => r.experiment === experiment && !r.skipped);
  const all = ids ?? [...new Set(rows.map((r) => r.algorithmId))];
  return all
    .map((id) => ({
      label: `${(GRAPH_ALGORITHMS as any)[id].shortLabel}${suffix}`,
      color: (GRAPH_ALGORITHM_COLORS as any)[id],
      dashed,
      points: rows.filter((r) => r.algorithmId === id).map((r) => [r.x, metric(r)] as [number, number]),
    }))
    .filter((s) => s.points.length);
}

// ---------------------------------------------------------------- G1
md.push(`## Tabelas geradas\n\nGerado por \`scripts/experiments/report.ts\` em ${new Date().toISOString().slice(0, 10)}. "n/e" = não executado (incompatível ou acima do limite).`);
h("G1 — Escalabilidade (geométrico esparso): tempo por execução (mediana)");
md.push(pivot("G1", (r) => r.timing.medianMs, ms, "n"));
h("G1 — Vértices expandidos");
md.push(pivot("G1", (r) => r.expansions, int, "n"));
h("G1 — Arcos examinados");
md.push(pivot("G1", (r) => r.edgeScans, int, "n"));
lineChart("g1-tempo.svg", "G1 — Tempo vs. n (geométrico esparso, log-log)", "n (vértices)", "tempo por execução (ms)", graphSeries("G1", (r) => r.timing.medianMs), { logX: true, logY: true, yFormat: (v) => nf(v, 4) });
lineChart("g1-expansoes.svg", "G1 — Vértices expandidos vs. n (log-log)", "n (vértices)", "vértices expandidos", graphSeries("G1", (r) => r.expansions), { logX: true, logY: true, yFormat: int });
const g1Consistency = [...new Set(G.filter((r) => r.experiment === "G1").map((r) => r.scenario))].map((s) => [...consistency(s).values()]).flat();
md.push(`\nConsistência G1: ${g1Consistency.filter((c) => c === "✗").length} divergência(s) em ${g1Consistency.length} resultados.`);

// ---------------------------------------------------------------- G2
h("G2 — Densidade (n = 400): tempo por execução");
md.push(pivot("G2", (r) => r.timing.medianMs, ms, "grau médio"));
h("G2 — Arcos examinados");
md.push(pivot("G2", (r) => r.edgeScans, int, "grau médio"));
lineChart("g2-densidade.svg", "G2 — Tempo vs. grau médio (n = 400, log-log)", "grau médio de saída", "tempo por execução (ms)", graphSeries("G2", (r) => r.timing.medianMs), { logX: true, logY: true, yFormat: (v) => nf(v, 4) });

// ---------------------------------------------------------------- cenários detalhados
for (const sc of ["G3-n200", "G3-n1000", "G3-n3000", "G4-pos-n20000", "G4-neg-n20000", "G5-30x30", "G5-100x100", "G7-negcycle-n500", "G8-disconnected-n10000"]) {
  const first = G.find((r) => r.scenario === sc);
  if (!first) continue;
  h(`${sc} — ${first.description} (arcos: ${int(first.arcs)})`);
  md.push(scenarioTable(sc));
}
h("G4 — DAG: tempo por execução vs. n");
md.push(pivot("G4pos", (r) => r.timing.medianMs, ms, "n (pesos ≥ 1)"));
md.push("");
md.push(pivot("G4neg", (r) => r.timing.medianMs, ms, "n (com negativos)"));

// ---------------------------------------------------------------- G6
h("G6 — Todos os pares: tempo por execução");
md.push(pivot("G6sparse", (r) => r.timing.medianMs, ms, "n (esparso)", int, ["floydWarshall", "johnson", "dijkstra"]));
md.push("");
md.push(pivot("G6dense", (r) => r.timing.medianMs, ms, "n (denso, grau ≈ n/2)", int, ["floydWarshall", "johnson", "dijkstra"]));
md.push("\n(Dijkstra = uma única origem, para referência de escala; não resolve todos os pares.)");

h("G9 — Efeito da numeração dos vértices");
{
  const rows = G.filter((r) => r.experiment.startsWith("G9") && !r.skipped && ["dijkstra", "bellmanFord", "dagShortestPath"].includes(r.algorithmId));
  md.push(
    table(
      ["Cenário", "Algoritmo", "Tempo (mediana)", "Rodadas (BF)", "Expansões", "Arcos examinados"],
      rows.map((r) => [r.description, gLabel(r.algorithmId), ms(r.timing.medianMs), r.extra?.rounds ?? "—", int(r.expansions), int(r.edgeScans)]),
      ["l", "l", "r", "r", "r", "r"]
    )
  );
}
lineChart(
  "g6-apsp.svg",
  "G6 — Todos os pares: tempo vs. n (log-log)",
  "n (vértices)",
  "tempo por execução (ms)",
  [
    ...graphSeries("G6sparse", (r) => r.timing.medianMs, ["floydWarshall", "johnson"], " (esparso)"),
    ...graphSeries("G6dense", (r) => r.timing.medianMs, ["floydWarshall", "johnson"], " (denso)", true),
  ],
  { logX: true, logY: true, yFormat: (v) => nf(v, 3) }
);

// ---------------------------------------------------------------- labirintos
const optimalOf = (scenario: string) => M.find((r) => r.scenario === scenario && r.algorithmId === "dijkstra" && r.variant === "padrão")?.pathCost ?? null;
const gap = (cost: number | null, opt: number | null) => (cost == null || opt == null || opt === 0 ? null : ((cost - opt) / opt) * 100);
const pct = (v: number | null) => (v == null ? "—" : v === 0 ? "0%" : `+${nf(v, 1)}%`);

function mazePivot(experiment: string, metric: (r: Row) => number | null, fmt: (v: number) => string, xName: string, xFmt: (x: number, r: Row) => string = (x) => int(x)): string {
  const rows = M.filter((r) => r.experiment === experiment && r.variant === "padrão");
  const xs = [...new Set(rows.map((r) => r.x))].sort((a, b) => a - b);
  const ids = [...new Set(rows.map((r) => r.algorithmId))];
  return table(
    [xName, ...ids.map((id) => (MAZE_ALGORITHMS as any)[id].shortLabel)],
    xs.map((x) => {
      const any0 = rows.find((r) => r.x === x);
      return [xFmt(x, any0), ...ids.map((id) => {
        const r = rows.find((q) => q.x === x && q.algorithmId === id);
        if (!r) return "n/e";
        const v = metric(r);
        return v == null ? "—" : fmt(v);
      })];
    })
  );
}

h("M1 — Tamanho do labirinto: tempo por execução (ACO/GA: média de 10 execuções)");
md.push(mazePivot("M1", (r) => r.timeMs, ms, "N"));
h("M1 — Vértices expandidos (ACO/GA: média)");
md.push(mazePivot("M1", (r) => (r.aggregate ? r.aggregate.expansions.mean : r.expansions), int, "N"));
h("M1 — Gap do custo em relação ao Dijkstra (ACO/GA: melhor | média)");
md.push(
  table(
    ["N", ...[...new Set(M.filter((r) => r.experiment === "M1").map((r) => r.algorithmId))].map((id) => (MAZE_ALGORITHMS as any)[id].shortLabel)],
    [...new Set(M.filter((r) => r.experiment === "M1").map((r) => r.x))].sort((a, b) => a - b).map((x) => {
      const sc = `M1-N${x}`;
      const opt = optimalOf(sc);
      return [int(x), ...[...new Set(M.filter((r) => r.experiment === "M1").map((r) => r.algorithmId))].map((id) => {
        const r = M.find((q) => q.scenario === sc && q.algorithmId === id);
        if (!r) return "n/e";
        if (r.aggregate) return `${pct(gap(r.aggregate.cost?.best ?? null, opt))} \\| ${pct(gap(r.aggregate.cost?.mean ?? null, opt))}`;
        return pct(gap(r.pathCost, opt));
      })];
    })
  )
);
const mSeries = (experiment: string, metric: (r: Row) => number): Series[] => {
  const rows = M.filter((r) => r.experiment === experiment && r.variant === "padrão");
  return [...new Set(rows.map((r) => r.algorithmId))].map((id) => ({
    label: (MAZE_ALGORITHMS as any)[id].shortLabel,
    color: (MAZE_ALGORITHM_COLORS as any)[id],
    points: rows.filter((r) => r.algorithmId === id).map((r) => [r.x, metric(r)] as [number, number]),
  }));
};
lineChart("m1-tempo.svg", "M1 — Tempo vs. lado do labirinto (log-log)", "N (labirinto N×N)", "tempo por execução (ms)", mSeries("M1", (r) => r.timeMs), { logX: true, logY: true, yFormat: (v) => nf(v, 3) });

h("M2 — Estrutura dos obstáculos (101×101): custo, gap, expansões e tempo");
{
  const rows = M.filter((r) => r.experiment === "M2" && r.variant === "padrão");
  const scs = [...new Set(rows.map((r) => r.scenario))];
  const out: (string | number)[][] = [];
  for (const sc of scs) {
    const opt = optimalOf(sc);
    for (const r of rows.filter((q) => q.scenario === sc)) {
      const cost = r.aggregate ? r.aggregate.cost?.best ?? null : r.pathCost;
      out.push([
        r.description,
        mLabel(r.algorithmId),
        cost == null ? "sem caminho" : int(cost),
        pct(gap(cost, opt)) + (r.aggregate ? ` (média ${pct(gap(r.aggregate.cost?.mean ?? null, opt))})` : ""),
        int(r.aggregate ? r.aggregate.expansions.mean : r.expansions),
        ms(r.timeMs),
      ]);
    }
  }
  md.push(table(["Estrutura", "Algoritmo", "Custo", "Gap", "Expansões", "Tempo"], out, ["l", "l", "r", "r", "r", "r"]));
}

h("M3 — Distância início–destino (201×201, 25% obstáculos): vértices expandidos");
md.push(mazePivot("M3", (r) => r.expansions, int, "distância (passos)"));
h("M3 — Tempo por execução");
md.push(mazePivot("M3", (r) => r.timeMs, ms, "distância (passos)"));
lineChart("m3-expansoes.svg", "M3 — Expansões vs. distância até o destino", "distância ótima (passos)", "vértices expandidos", mSeries("M3", (r) => r.expansions), { yFormat: int });

h("M4 — Algoritmos estocásticos: 10 execuções (sementes 1–10)");
{
  const rows = M.filter((r) => r.experiment === "M4" && r.aggregate);
  md.push(
    table(
      ["Instância", "Algoritmo", "Variante", "Sucesso", "Custo ótimo", "Melhor custo (gap)", "Custo médio ± dp (gap)", "Tempo médio ± dp", "Expansões (média)"],
      rows.map((r) => {
        const opt = optimalOf(r.scenario);
        const a = r.aggregate;
        return [
          r.description,
          (MAZE_ALGORITHMS as any)[r.algorithmId].shortLabel,
          r.variant,
          `${a.successes}/${a.runs}`,
          opt == null ? "—" : int(opt),
          a.cost ? `${int(a.cost.best)} (${pct(gap(a.cost.best, opt))})` : "—",
          a.cost ? `${nf(a.cost.mean, 1)} ± ${nf(a.cost.std, 1)} (${pct(gap(a.cost.mean, opt))})` : "—",
          `${ms(a.time.mean)} ± ${ms(a.time.std)}`,
          int(a.expansions.mean),
        ];
      }),
      ["l", "l", "l", "r", "r", "r", "r", "r", "r"]
    )
  );
  const bars: Bar[] = rows
    .filter((r) => r.variant === "padrão")
    .map((r) => {
      const opt = optimalOf(r.scenario)!;
      return {
        group: r.description.replace("Labirinto ", "Lab. ").replace(" (braid 0,08)", "").replace("Grid 51×51 com 25% de obstáculos", "51×51, 25%"),
        label: (MAZE_ALGORITHMS as any)[r.algorithmId].shortLabel,
        color: (MAZE_ALGORITHM_COLORS as any)[r.algorithmId],
        value: gap(r.aggregate.cost.mean, opt)!,
        err: (r.aggregate.cost.std / opt) * 100,
        marker: gap(r.aggregate.cost.best, opt)!,
      };
    });
  barChart("m4-gap.svg", "M4 — Gap médio do custo (barra), dp (traço) e melhor execução (◆)", "gap em relação ao ótimo (%)", bars, (v) => `${nf(v, 0)}%`);
}

md.push(`\n### Ambiente\n\n${table(["Item", "Valor"], Object.entries(graph.environment).map(([k, v]) => [k, String(v)]), ["l", "l"])}`);
writeFileSync(path.join(dir, "tabelas-geradas.md"), md.filter((l) => l !== "").join("\n\n") + "\n");
console.log("ok: tabelas-geradas.md e figuras/*.svg");
