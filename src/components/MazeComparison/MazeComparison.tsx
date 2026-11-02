import type { MazeAlgorithmId, MazeSolveResult } from "../../maze/algorithms/types";
import { MAZE_ALGORITHMS, OPERATION_LABELS } from "../../maze/algorithms/registry";
import { MAZE_ALGORITHM_COLORS } from "../../maze/algorithms/colors";
import { aggregateRuns, computeGap, optimalityVerdict } from "../../maze/algorithms/stats";
import { SubSectionTitle, TitleContainer } from "../../pages/styles";
import { FieldHint } from "../../pages/mazeStyles";
import { fmtGap, fmtInt, fmtMs, fmtNumber, VERDICT_LABELS } from "../MazeResults/format";
import MetricBarChart from "./MetricBarChart";
import {
  TableScroll,
  ComparisonTable,
  ClickableRow,
  AlgoName,
  Badge,
  SubValue,
  ChartGrid,
  RunsDetails,
} from "./styles";

type Props = {
  results: MazeSolveResult[];
  optimal: number | null;
  dijkstraRan: boolean;
  selectedId: MazeAlgorithmId | null;
  onSelect: (id: MazeAlgorithmId) => void;
};

const EPS = 1e-9;

function MazeComparison({ results, optimal, dijkstraRan, selectedId, onSelect }: Props) {
  const fastest = Math.min(...results.map((r) => r.timeMs));
  const found = results.filter((r) => r.status === "found");
  const bestCost = found.length ? Math.min(...found.map((r) => r.pathCost!)) : null;
  const stochastic = results.filter((r) => r.stochastic);
  const noRefReason = !dijkstraRan
    ? "Dijkstra não executado"
    : optimal == null
      ? "sem caminho de referência"
      : undefined;

  return (
    <>
      {optimal == null && (
        <FieldHint>
          {dijkstraRan
            ? "O Dijkstra não encontrou caminho, então não há custo ótimo de referência: o gap não é calculado."
            : "Selecione o Dijkstra para obter o custo ótimo de referência e calcular o gap dos demais algoritmos."}
        </FieldHint>
      )}

      <TableScroll>
        <ComparisonTable>
          <thead>
            <tr>
              <th>Algoritmo</th>
              <th>Status</th>
              <th className="num">Custo</th>
              <th className="num" title="Inclui início e destino">Células</th>
              <th className="num">Tempo</th>
              <th className="num">Expansões</th>
              <th>Operações</th>
              <th className="num">Gap</th>
              <th>Optimalidade</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const ok = r.status === "found";
              const agg = r.stochastic ? aggregateRuns(r.runs) : null;
              const verdict = VERDICT_LABELS[optimalityVerdict(r, optimal)];
              const isFastest = r.timeMs <= fastest + EPS;
              const isBest = ok && bestCost != null && r.pathCost! <= bestCost + EPS;
              return (
                <ClickableRow
                  key={r.algorithmId}
                  $selected={r.algorithmId === selectedId}
                  onClick={() => onSelect(r.algorithmId)}
                  title="Clique para ver o caminho deste algoritmo"
                >
                  <td>
                    <AlgoName $color={MAZE_ALGORITHM_COLORS[r.algorithmId]}>{r.label}</AlgoName>
                    {isFastest && <Badge $color="#a8c4ff">mais rápido</Badge>}
                    {isBest && <Badge $color="#86efac">melhor caminho</Badge>}
                    {agg && <SubValue>melhor de {agg.runs} execução(ões)</SubValue>}
                  </td>
                  <td style={{ color: ok ? "#86efac" : "#fbbf24" }}>
                    {ok ? "Encontrado" : "Inexistente"}
                    {agg && <SubValue>sucesso {fmtNumber(agg.successRate * 100, 0)}%</SubValue>}
                  </td>
                  <td className="num">
                    {ok ? fmtNumber(r.pathCost!) : "—"}
                    {agg?.cost && agg.runs > 1 && <SubValue>média {fmtNumber(agg.cost.mean, 1)}</SubValue>}
                  </td>
                  <td className="num">{ok ? fmtInt(r.pathCells) : "—"}</td>
                  <td className="num">
                    {fmtMs(r.timeMs)}
                    {agg && agg.runs > 1 && <SubValue>média ± {fmtMs(agg.time.std)}</SubValue>}
                  </td>
                  <td className="num">
                    {fmtInt(agg ? agg.expansions.mean : r.nodeExpansions)}
                    {agg && agg.runs > 1 && <SubValue>média</SubValue>}
                  </td>
                  <td className="wrap">
                    {Object.entries(r.operations).map(([k, v]) => (
                      <SubValue key={k} title={OPERATION_LABELS[k]?.title} style={{ marginTop: 0 }}>
                        {OPERATION_LABELS[k]?.label ?? k}: <span style={{ color: "#ddd" }}>{fmtInt(v)}</span>
                      </SubValue>
                    ))}
                  </td>
                  <td className="num">{fmtGap(computeGap(r.pathCost, optimal))}</td>
                  <td title={verdict.title} style={{ color: verdict.color }}>
                    {verdict.label}
                    <SubValue>
                      {MAZE_ALGORITHMS[r.algorithmId].guaranteesOptimal
                        ? r.guaranteesOptimal
                          ? "garantia teórica"
                          : "garantia não vale com pesos"
                        : "sem garantia teórica"}
                    </SubValue>
                  </td>
                </ClickableRow>
              );
            })}
          </tbody>
        </ComparisonTable>
      </TableScroll>
      <FieldHint>
        Tempo = média de uma execução só da lógica de busca (performance.now(), sem renderização),
        com a mesma metodologia para todos. Para ACO e GA, custo, células, gap e operações vêm da
        melhor execução; tempo e expansões são médias entre as execuções. Expansões seguem a
        definição de cada algoritmo (veja o cartão de métricas); operações são contagens da própria
        busca, não instruções de CPU. Gap = (custo − ótimo) / ótimo × 100, com o Dijkstra como ótimo.
      </FieldHint>

      <ChartGrid>
        <MetricBarChart
          title="Tempo de execução"
          note="Média por execução (ms)."
          rows={results.map((r) => ({ id: r.algorithmId, label: MAZE_ALGORITHMS[r.algorithmId].shortLabel, color: MAZE_ALGORITHM_COLORS[r.algorithmId], value: r.timeMs }))}
          format={(v) => fmtMs(v)}
          log
        />
        <MetricBarChart
          title="Vértices expandidos"
          note="Por execução (média para ACO e GA)."
          rows={results.map((r) => ({
            id: r.algorithmId,
            label: MAZE_ALGORITHMS[r.algorithmId].shortLabel,
            color: MAZE_ALGORITHM_COLORS[r.algorithmId],
            value: r.stochastic ? aggregateRuns(r.runs).expansions.mean : r.nodeExpansions,
          }))}
          format={(v) => fmtInt(v)}
          log
        />
        <MetricBarChart
          title="Custo do caminho"
          note="Menor é melhor (melhor execução para ACO e GA)."
          rows={results.map((r) => ({
            id: r.algorithmId,
            label: MAZE_ALGORITHMS[r.algorithmId].shortLabel,
            color: MAZE_ALGORITHM_COLORS[r.algorithmId],
            value: r.status === "found" ? r.pathCost : null,
            missingReason: "sem caminho",
          }))}
          format={(v) => fmtNumber(v)}
          emptyMessage="Nenhum algoritmo encontrou caminho."
        />
        <MetricBarChart
          title="Gap em relação ao ótimo"
          note="0% = mesmo custo do Dijkstra."
          rows={results.map((r) => ({
            id: r.algorithmId,
            label: MAZE_ALGORITHMS[r.algorithmId].shortLabel,
            color: MAZE_ALGORITHM_COLORS[r.algorithmId],
            value: computeGap(r.pathCost, optimal),
            missingReason: r.status !== "found" ? "sem caminho" : noRefReason,
          }))}
          format={(v) => `${fmtNumber(v, 1)}%`}
          emptyMessage={
            noRefReason
              ? `Gap indisponível: ${noRefReason}.`
              : "Nenhum algoritmo encontrou caminho."
          }
        />
      </ChartGrid>

      {stochastic.length > 0 && (
        <>
          <TitleContainer>
            <SubSectionTitle>Execuções repetidas (ACO e GA)</SubSectionTitle>
            <FieldHint>
              Todas as execuções usam o mesmo labirinto, com sementes diferentes. dp = desvio padrão
              amostral.
            </FieldHint>
          </TitleContainer>
          <TableScroll>
            <ComparisonTable>
              <thead>
                <tr>
                  <th>Algoritmo</th>
                  <th className="num">Execuções</th>
                  <th className="num">Sucesso</th>
                  <th className="num">Tempo médio ± dp</th>
                  <th className="num">Melhor tempo</th>
                  <th className="num">Custo médio ± dp</th>
                  <th className="num">Melhor custo</th>
                  <th className="num">Gap do melhor</th>
                  <th className="num">Gap médio</th>
                </tr>
              </thead>
              <tbody>
                {stochastic.map((r) => {
                  const agg = aggregateRuns(r.runs);
                  return (
                    <tr key={r.algorithmId}>
                      <td>
                        <AlgoName $color={MAZE_ALGORITHM_COLORS[r.algorithmId]}>{r.label}</AlgoName>
                      </td>
                      <td className="num">{agg.runs}</td>
                      <td className="num">
                        {fmtNumber(agg.successRate * 100, 0)}% ({agg.successes}/{agg.runs})
                      </td>
                      <td className="num">
                        {fmtMs(agg.time.mean)} ± {fmtMs(agg.time.std)}
                      </td>
                      <td className="num">{fmtMs(agg.time.best)}</td>
                      <td className="num">
                        {agg.cost ? `${fmtNumber(agg.cost.mean, 1)} ± ${fmtNumber(agg.cost.std, 1)}` : "—"}
                      </td>
                      <td className="num">{agg.cost ? fmtNumber(agg.cost.best) : "—"}</td>
                      <td className="num">{fmtGap(computeGap(agg.cost?.best ?? null, optimal))}</td>
                      <td className="num">{fmtGap(computeGap(agg.cost?.mean ?? null, optimal))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </ComparisonTable>
          </TableScroll>

          {stochastic.map((r) => (
            <RunsDetails key={r.algorithmId}>
              <summary>
                Execuções individuais — {r.label} ({r.runs.length})
              </summary>
              <TableScroll>
                <ComparisonTable>
                  <thead>
                    <tr>
                      <th className="num">#</th>
                      <th className="num">Semente</th>
                      <th>Status</th>
                      <th className="num">Custo</th>
                      <th className="num">Células</th>
                      <th className="num">Tempo</th>
                      <th className="num">Expansões</th>
                      <th className="num">Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.runs.map((run, i) => (
                      <tr key={i}>
                        <td className="num">{i + 1}</td>
                        <td className="num">{run.seed}</td>
                        <td style={{ color: run.found ? "#86efac" : "#fbbf24" }}>
                          {run.found ? "Encontrado" : "Inexistente"}
                        </td>
                        <td className="num">{run.found ? fmtNumber(run.pathCost!) : "—"}</td>
                        <td className="num">{run.found ? fmtInt(run.pathCells) : "—"}</td>
                        <td className="num">{fmtMs(run.timeMs)}</td>
                        <td className="num">{fmtInt(run.nodeExpansions)}</td>
                        <td className="num">{fmtGap(computeGap(run.pathCost, optimal))}</td>
                      </tr>
                    ))}
                  </tbody>
                </ComparisonTable>
              </TableScroll>
            </RunsDetails>
          ))}
        </>
      )}
    </>
  );
}

export default MazeComparison;
