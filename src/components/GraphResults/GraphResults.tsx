import { useState } from "react";
import type { GraphRunResult } from "../../graph/benchmark/runner";
import { checkConsistency, referenceResult } from "../../graph/benchmark/consistency";
import { GRAPH_ALGORITHMS, GRAPH_OPERATION_LABELS, PROBLEM_LABELS } from "../../graph/algorithms/registry";
import { GRAPH_ALGORITHM_COLORS } from "../../graph/algorithms/colors";
import type { GraphAlgorithmId, ProblemKind } from "../../graph/algorithms/types";
import { pathFromPrev } from "../../graph/algorithms/singleSource";
import MetricBarChart from "../MazeComparison/MetricBarChart";
import {
  TableScroll,
  ComparisonTable,
  ClickableRow,
  AlgoName,
  Badge,
  SubValue,
  ChartGrid,
} from "../MazeComparison/styles";
import { fmtInt, fmtMs, fmtNumber } from "../MazeResults/format";
import { StatusBanner, FieldHint, ActionButton } from "../../pages/mazeStyles";
import {
  SubSectionTitle,
  TitleContainer,
  MetricsAlgoCard,
  MetricsAlgoTitle,
  MetricsAlgoHint,
  MetricsStatGrid,
  MetricsStat,
  MetricsStatLabel,
  MetricsStatValueRow,
  MetricsStatNumber,
  MetricsStatUnit,
  SkippedReason,
} from "../../pages/styles";

export type SkippedAlgorithm = { algorithmId: GraphAlgorithmId; reason: string };

type Props = {
  results: GraphRunResult[];
  skipped: SkippedAlgorithm[];
  labels: string[];
  sourceIndex: number;
  targetIndex: number | null;
  selectedId: GraphAlgorithmId | null;
  onSelect: (id: GraphAlgorithmId) => void;
};

const PROBLEMS: ProblemKind[] = ["sssp", "p2p", "apsp"];
const EPS = 1e-9;

function fmtDistance(d: number): string {
  if (d === Infinity) return "∞";
  if (d === -Infinity) return "−∞";
  return fmtNumber(d, 6);
}

function pathText(path: number[] | null, labels: string[]): string {
  if (!path) return "—";
  const names = path.map((v) => labels[v]);
  return names.length > 14 ? [...names.slice(0, 10), "…", ...names.slice(-3)].join(" → ") : names.join(" → ");
}

function Stat({ label, value, unit, title }: { label: string; value: string; unit?: string; title?: string }) {
  return (
    <MetricsStat title={title}>
      <MetricsStatLabel>{label}</MetricsStatLabel>
      <MetricsStatValueRow>
        <MetricsStatNumber>{value}</MetricsStatNumber>
        {unit && <MetricsStatUnit>{unit}</MetricsStatUnit>}
      </MetricsStatValueRow>
    </MetricsStat>
  );
}

function GraphResults({ results, skipped, labels, sourceIndex, targetIndex, selectedId, onSelect }: Props) {
  const [visibleRows, setVisibleRows] = useState(10);
  const ref = referenceResult(results);
  const consistency = new Map(results.map((r) => [r.algorithmId, checkConsistency(r, ref)]));
  const mismatched = results.filter((r) => consistency.get(r.algorithmId)!.status === "mismatch");
  const negative = results.filter((r) => r.status === "negative-cycle");
  const selected = results.find((r) => r.algorithmId === selectedId) ?? results[0];
  // Tabela de distâncias: do selecionado, ou da referência se ele só calcula até o destino.
  const distSource = selected?.sourceDistances ? selected : ref;

  const targetAnswer =
    targetIndex == null
      ? null
      : (results.find((r) => r === ref && r.target) ?? results.find((r) => r.status === "ok" && r.target))?.target ?? null;

  return (
    <>
      {negative.length > 0 && (
        <StatusBanner $ok={false}>
          <strong>Ciclo negativo.</strong>{" "}
          {negative.map((r) => r.label).join(", ")} encontrou ciclo de custo negativo: distâncias que passam por ele não
          têm mínimo (exibidas como −∞). Isso é um resultado válido, não um erro.
        </StatusBanner>
      )}
      {targetAnswer && targetIndex != null && (
        <StatusBanner $ok={Number.isFinite(targetAnswer.distance)}>
          {targetAnswer.distance === Infinity ? (
            <>
              <strong>Sem caminho</strong> de {labels[sourceIndex]} até {labels[targetIndex]}: o destino é inalcançável.
            </>
          ) : targetAnswer.distance === -Infinity ? (
            <>
              <strong>Distância indefinida</strong> de {labels[sourceIndex]} até {labels[targetIndex]}: um ciclo negativo
              permite reduzir o custo indefinidamente.
            </>
          ) : (
            <>
              <strong>
                Menor distância de {labels[sourceIndex]} até {labels[targetIndex]}: {fmtDistance(targetAnswer.distance)}
              </strong>{" "}
              ({(targetAnswer.path?.length ?? 1) - 1} arestas): {pathText(targetAnswer.path, labels)}
            </>
          )}
        </StatusBanner>
      )}
      {ref && (
        <StatusBanner $ok={mismatched.length === 0}>
          {mismatched.length === 0 ? (
            <>
              <strong>Resultados consistentes:</strong> todos os algoritmos comparáveis concordam com {ref.label}
              {targetIndex == null ? " em todas as distâncias." : " (distâncias da origem e/ou até o destino)."}
            </>
          ) : (
            <>
              <strong>Divergência:</strong> {mismatched.map((r) => r.label).join(", ")} difere(m) de {ref.label}.
            </>
          )}
        </StatusBanner>
      )}

      {PROBLEMS.map((problem) => {
        const group = results.filter((r) => r.problem === problem);
        if (group.length === 0) return null;
        const fastest = Math.min(...group.map((r) => r.timing.medianMs));
        return (
          <div key={problem} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <TitleContainer>
              <SubSectionTitle $margin="0 0 2px">{PROBLEM_LABELS[problem].title}</SubSectionTitle>
              <FieldHint>
                {PROBLEM_LABELS[problem].description} Tempos só são comparáveis dentro deste grupo.
              </FieldHint>
            </TitleContainer>
            <TableScroll>
              <ComparisonTable>
                <thead>
                  <tr>
                    <th>Algoritmo</th>
                    <th>Status</th>
                    {targetIndex != null && <th className="num">Dist. ao destino</th>}
                    {targetIndex != null && <th className="num" title="Arestas no caminho até o destino">Arestas</th>}
                    {problem !== "p2p" && <th className="num">Alcançados</th>}
                    <th className="num" title="Mediana por execução; ± desvio padrão entre amostras">Tempo</th>
                    <th className="num">Expansões</th>
                    <th className="num">Arcos examinados</th>
                    <th className="num">Relaxações</th>
                    <th>Consistência</th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((r) => {
                    const c = consistency.get(r.algorithmId)!;
                    return (
                      <ClickableRow
                        key={r.algorithmId}
                        $selected={r.algorithmId === selected?.algorithmId}
                        onClick={() => onSelect(r.algorithmId)}
                        title="Clique para ver detalhes e destacar o caminho no grafo"
                      >
                        <td>
                          <AlgoName $color={GRAPH_ALGORITHM_COLORS[r.algorithmId]}>{r.label}</AlgoName>
                          {group.length > 1 && r.timing.medianMs <= fastest + EPS && <Badge $color="#a8c4ff">mais rápido</Badge>}
                        </td>
                        <td style={{ color: r.status === "ok" ? "#86efac" : "#fbbf24" }}>
                          {r.status === "ok" ? "Válido" : "Ciclo negativo"}
                        </td>
                        {targetIndex != null && (
                          <td className="num">{r.target ? fmtDistance(r.target.distance) : "—"}</td>
                        )}
                        {targetIndex != null && (
                          <td className="num">{r.target?.path ? r.target.path.length - 1 : "—"}</td>
                        )}
                        {problem !== "p2p" && <td className="num">{r.reached != null ? fmtInt(r.reached) : "—"}</td>}
                        <td className="num">
                          {fmtMs(r.timing.medianMs)}
                          {r.timing.samples > 1 && <SubValue>± {fmtMs(r.timing.stdMs)}</SubValue>}
                        </td>
                        <td className="num">{fmtInt(r.counters.expansions)}</td>
                        <td className="num">{fmtInt(r.counters.edgeScans)}</td>
                        <td className="num">{fmtInt(r.counters.relaxations)}</td>
                        <td
                          style={{
                            color: c.status === "mismatch" ? "#fca5a5" : c.status === "unavailable" ? "#9a9aa8" : "#86efac",
                          }}
                        >
                          {c.status === "reference"
                            ? "referência"
                            : c.status === "match"
                              ? "✓ igual"
                              : c.status === "mismatch"
                                ? `✗ ${c.count} diferença(s)`
                                : "—"}
                        </td>
                      </ClickableRow>
                    );
                  })}
                </tbody>
              </ComparisonTable>
            </TableScroll>
            {group.length > 1 && (
              <ChartGrid>
                <MetricBarChart
                  title="Tempo por execução"
                  note="Mediana das amostras (ms)."
                  rows={group.map((r) => ({
                    id: r.algorithmId,
                    label: GRAPH_ALGORITHMS[r.algorithmId].shortLabel,
                    color: GRAPH_ALGORITHM_COLORS[r.algorithmId],
                    value: r.timing.medianMs,
                  }))}
                  format={fmtMs}
                  log
                />
                <MetricBarChart
                  title="Vértices expandidos"
                  note="Definição por algoritmo (veja os detalhes)."
                  rows={group.map((r) => ({
                    id: r.algorithmId,
                    label: GRAPH_ALGORITHMS[r.algorithmId].shortLabel,
                    color: GRAPH_ALGORITHM_COLORS[r.algorithmId],
                    value: r.counters.expansions,
                  }))}
                  format={fmtInt}
                  log
                />
                <MetricBarChart
                  title="Arcos examinados"
                  note="Arestas percorridas pela busca."
                  rows={group.map((r) => ({
                    id: r.algorithmId,
                    label: GRAPH_ALGORITHMS[r.algorithmId].shortLabel,
                    color: GRAPH_ALGORITHM_COLORS[r.algorithmId],
                    value: r.counters.edgeScans,
                  }))}
                  format={fmtInt}
                  log
                />
              </ChartGrid>
            )}
          </div>
        );
      })}

      {skipped.length > 0 && (
        <>
          <TitleContainer>
            <SubSectionTitle $margin="8px 0 2px">Marcados, mas indisponíveis neste grafo</SubSectionTitle>
            <FieldHint>
              Estes algoritmos estão marcados na seleção, mas o grafo ou a consulta não atendem aos requisitos deles, então
              não foram executados.
            </FieldHint>
          </TitleContainer>
          {skipped.map((s) => (
            <SkippedReason key={s.algorithmId}>
              <strong>{GRAPH_ALGORITHMS[s.algorithmId].label}:</strong> {s.reason}
            </SkippedReason>
          ))}
        </>
      )}

      {selected && (
        <MetricsAlgoCard $accent={GRAPH_ALGORITHM_COLORS[selected.algorithmId]}>
          <MetricsAlgoTitle>Detalhes — {selected.label}</MetricsAlgoTitle>
          {GRAPH_ALGORITHMS[selected.algorithmId].experimental && (
            <MetricsAlgoHint style={{ color: "#7dd3fc" }}>
              <strong>Experimental.</strong> {GRAPH_ALGORITHMS[selected.algorithmId].experimental} Não atinge o limite
              teórico porque: (1) os valores ⟨distância, saltos, vértice⟩ são objetos alocados a cada comparação e o
              estado usa Map/Set, em vez de arrays tipados; (2) blocos são divididos por ordenação (O(M log M)) e não
              por seleção linear de mediana; (3) a estrutura do Lemma 3.3 não tem as garantias amortizadas do artigo;
              (4) a transformação para grau constante é explícita e dobra o grafo; (5) a vantagem é assintótica
              (log^2/3 n vs. log n ≈ 2,4× em n = 10⁴) e as constantes da recursão são bem maiores que as de uma heap.
              Detalhes e o que faltaria em src/graph/algorithms/duanSssp.ts.
            </MetricsAlgoHint>
          )}
          <MetricsAlgoHint>
            {GRAPH_ALGORITHMS[selected.algorithmId].expansionDefinition} Arcos examinados = arestas percorridas;
            relaxações = distâncias provisórias que diminuíram. São contagens da própria implementação, não instruções de
            CPU.
          </MetricsAlgoHint>
          <MetricsStatGrid>
            <Stat
              label="Tempo (mediana)"
              value={fmtMs(selected.timing.medianMs)}
              unit={`${selected.timing.samples} amostra(s) × ${fmtInt(selected.timing.batchRuns)} execução(ões)`}
              title="Cada amostra repete a execução até somar ≥ 2 ms; antes, um aquecimento não medido."
            />
            <Stat
              label="Mín. / máx. / média"
              value={`${fmtMs(selected.timing.minMs)} / ${fmtMs(selected.timing.maxMs)}`}
              unit={`média ${fmtMs(selected.timing.meanMs)}`}
            />
            {Object.entries(selected.counters.extra).map(([k, v]) => (
              <Stat key={k} label={GRAPH_OPERATION_LABELS[k]?.label ?? k} value={fmtInt(v)} title={GRAPH_OPERATION_LABELS[k]?.title} />
            ))}
            {selected.info?.heuristicScale != null && (
              <Stat
                label="Fator da heurística (A*)"
                value={fmtNumber(selected.info.heuristicScale, 5)}
                unit="h(v) = fator × distância euclidiana até o destino"
                title="Maior fator que mantém h admissível: fator × distância(u,v) ≤ peso(u,v) para todo arco. 0 = sem informação (vira Dijkstra)."
              />
            )}
          </MetricsStatGrid>
        </MetricsAlgoCard>
      )}

      {distSource?.sourceDistances && (
        <>
          <TitleContainer>
            <SubSectionTitle $margin="8px 0 2px">Distâncias a partir de {labels[sourceIndex]}</SubSectionTitle>
            <FieldHint>
              Calculadas por {distSource.label}
              {selected && distSource !== selected ? ` (${selected.label} só calcula até o destino)` : ""}. ∞ =
              inalcançável; −∞ = afetada por ciclo negativo.
            </FieldHint>
          </TitleContainer>
          <TableScroll>
            <ComparisonTable>
              <thead>
                <tr>
                  <th>Vértice</th>
                  <th className="num">Distância</th>
                  <th>Caminho</th>
                </tr>
              </thead>
              <tbody>
                {labels.slice(0, visibleRows).map((label, v) => {
                  const d = distSource.sourceDistances![v];
                  const path = distSource.sourcePrev ? pathFromPrev(distSource.sourcePrev, distSource.sourceDistances!, sourceIndex, v) : null;
                  return (
                    <tr key={v}>
                      <td>
                        {label}
                        {v === sourceIndex && <SubValue style={{ display: "inline", marginLeft: 8, color: "#4ade80" }}>origem</SubValue>}
                        {v === targetIndex && <SubValue style={{ display: "inline", marginLeft: 8, color: "#f87171" }}>destino</SubValue>}
                      </td>
                      <td className="num" style={{ color: Number.isFinite(d) ? undefined : "#fbbf24" }}>
                        {fmtDistance(d)}
                      </td>
                      <td className="wrap" style={{ color: "#c8c8d0" }}>
                        {pathText(path, labels)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </ComparisonTable>
          </TableScroll>
          {labels.length > visibleRows && (
            <ActionButton type="button" $variant="secondary" onClick={() => setVisibleRows((n) => n + 20)}>
              Mostrar mais 20 ({fmtInt(labels.length - visibleRows)} restantes)
            </ActionButton>
          )}
        </>
      )}
    </>
  );
}

export default GraphResults;
