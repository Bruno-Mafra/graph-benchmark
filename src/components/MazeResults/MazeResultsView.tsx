import { useState } from "react";
import MazeCanvas from "../MazeCanvas/MazeCanvas";
import type { MazeGrid } from "../../maze/model";
import type { MazeAlgorithmId, MazeSolveResult } from "../../maze/algorithms/types";
import { MAZE_ALGORITHMS, OPERATION_LABELS } from "../../maze/algorithms/registry";
import { MAZE_ALGORITHM_COLORS } from "../../maze/algorithms/colors";
import { aggregateRuns, computeGap, optimalityVerdict } from "../../maze/algorithms/stats";
import {
  MetricsAlgoCard,
  MetricsAlgoTitle,
  MetricsAlgoHint,
  MetricsStatGrid,
  MetricsStat,
  MetricsStatLabel,
  MetricsStatValueRow,
  MetricsStatNumber,
  MetricsStatUnit,
  CheckboxRow,
} from "../../pages/styles";
import { ModeButton, ToolGroup, ToolGroupLabel, StatusBanner } from "../../pages/mazeStyles";
import { fmtGap, fmtInt, fmtMs, fmtNumber, VERDICT_LABELS } from "./format";
import {
  ViewToolbar,
  ThumbGrid,
  ThumbCard,
  ThumbTitle,
  ThumbStats,
  SingleLayout,
  SingleCanvasColumn,
} from "./styles";

const ZOOM_LEVELS = [1, 2, 4, 8];

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

/** Métricas de um algoritmo, exibidas ao lado do labirinto individual. */
export function MazeResultCard({ result, optimal }: { result: MazeSolveResult; optimal: number | null }) {
  const algorithm = MAZE_ALGORITHMS[result.algorithmId];
  const found = result.status === "found";
  const verdict = VERDICT_LABELS[optimalityVerdict(result, optimal)];
  const agg = result.stochastic ? aggregateRuns(result.runs) : null;

  return (
    <MetricsAlgoCard $accent={MAZE_ALGORITHM_COLORS[result.algorithmId]}>
      <MetricsAlgoTitle>{result.label}</MetricsAlgoTitle>
      <MetricsAlgoHint>
        {algorithm.expansionDefinition}
        {agg &&
          ` Caminho, custo e operações vêm da melhor de ${agg.runs} execução(ões); tempo e expansões são médias por execução.`}
      </MetricsAlgoHint>
      <MetricsStatGrid>
        <MetricsStat>
          <MetricsStatLabel>Status da busca</MetricsStatLabel>
          <MetricsStatValueRow>
            <MetricsStatNumber style={{ color: found ? "#86efac" : "#fbbf24" }}>
              {found ? "Caminho encontrado" : "Caminho inexistente"}
            </MetricsStatNumber>
          </MetricsStatValueRow>
        </MetricsStat>
        <MetricsStat title={verdict.title}>
          <MetricsStatLabel>Optimalidade</MetricsStatLabel>
          <MetricsStatValueRow>
            <MetricsStatNumber style={{ color: verdict.color }}>{verdict.label}</MetricsStatNumber>
          </MetricsStatValueRow>
        </MetricsStat>
        <Stat
          label="Distância do caminho"
          value={found ? fmtNumber(result.pathCost!) : "—"}
          unit={found ? "custo" : undefined}
          title="Soma dos custos dos movimentos. Com custo 1 por movimento, é o número de movimentos."
        />
        <Stat
          label="Gap vs. ótimo"
          value={fmtGap(computeGap(result.pathCost, optimal))}
          unit={optimal == null ? "sem referência do Dijkstra" : `ótimo = ${fmtNumber(optimal)}`}
        />
        <Stat
          label="Tamanho do caminho"
          value={found ? fmtInt(result.pathCells) : "—"}
          unit={found ? "células (inclui início e destino)" : undefined}
        />
        <Stat
          label={agg ? "Tempo médio por execução" : "Tempo de execução"}
          value={fmtMs(result.timeMs)}
          unit={agg ? `± ${fmtMs(agg.time.std)} (dp)` : undefined}
          title="Só a lógica de busca, medida com performance.now(), sem renderização."
        />
        <Stat
          label={agg ? "Expansões (média)" : "Expansões de vértices"}
          value={fmtInt(agg ? agg.expansions.mean : result.nodeExpansions)}
          title={algorithm.expansionDefinition}
        />
        {agg && (
          <Stat
            label="Taxa de sucesso"
            value={`${fmtNumber(agg.successRate * 100, 0)}%`}
            unit={`${agg.successes}/${agg.runs} execuções`}
          />
        )}
        {Object.entries(result.operations).map(([key, value]) => {
          const meta = OPERATION_LABELS[key];
          return (
            <Stat key={key} label={meta?.label ?? key} value={fmtInt(value)} unit={meta?.unit} title={meta?.title} />
          );
        })}
      </MetricsStatGrid>
    </MetricsAlgoCard>
  );
}

type Props = {
  grid: MazeGrid;
  results: MazeSolveResult[];
  selectedId: MazeAlgorithmId | null;
  view: "grid" | "single";
  optimal: number | null;
  onSelect: (id: MazeAlgorithmId) => void;
  onShowGrid: () => void;
};

/**
 * Caminhos encontrados: miniaturas lado a lado (um labirinto por algoritmo) ou
 * um único labirinto grande com as métricas do algoritmo escolhido. Alternar
 * apenas muda o que é desenhado; os resultados já calculados são reutilizados.
 */
function MazeResultsView({ grid, results, selectedId, view, optimal, onSelect, onShowGrid }: Props) {
  const [showExplored, setShowExplored] = useState(true);
  const [zoom, setZoom] = useState(1);
  const selected = results.find((r) => r.algorithmId === selectedId) ?? results[0];

  return (
    <>
      <ViewToolbar>
        <ToolGroup>
          <ToolGroupLabel>Exibir</ToolGroupLabel>
          {results.length > 1 && (
            <ModeButton type="button" $active={view === "grid"} aria-pressed={view === "grid"} onClick={onShowGrid}>
              Lado a lado
            </ModeButton>
          )}
          {results.map((r) => (
            <ModeButton
              key={r.algorithmId}
              type="button"
              $swatch={MAZE_ALGORITHM_COLORS[r.algorithmId]}
              $active={view === "single" && selected?.algorithmId === r.algorithmId}
              aria-pressed={view === "single" && selected?.algorithmId === r.algorithmId}
              onClick={() => onSelect(r.algorithmId)}
            >
              {r.label}
            </ModeButton>
          ))}
        </ToolGroup>
        <CheckboxRow>
          <input type="checkbox" checked={showExplored} onChange={(e) => setShowExplored(e.target.checked)} />
          <span>Mostrar células exploradas</span>
        </CheckboxRow>
      </ViewToolbar>

      {view === "grid" ? (
        <ThumbGrid>
          {results.map((r) => {
            const found = r.status === "found";
            return (
              <ThumbCard
                key={r.algorithmId}
                type="button"
                $accent={MAZE_ALGORITHM_COLORS[r.algorithmId]}
                onClick={() => onSelect(r.algorithmId)}
                title="Ver em tamanho grande"
              >
                <ThumbTitle>
                  <strong>{r.label}</strong>
                  <span>ampliar ↗</span>
                </ThumbTitle>
                <ThumbStats $ok={found}>
                  {found
                    ? `custo ${fmtNumber(r.pathCost!)} · gap ${fmtGap(computeGap(r.pathCost, optimal))} · ${fmtMs(r.timeMs)}`
                    : "Caminho inexistente"}
                </ThumbStats>
                <MazeCanvas grid={grid} result={r} showExplored={showExplored} zoom={1} editable={false} />
              </ThumbCard>
            );
          })}
        </ThumbGrid>
      ) : (
        selected && (
          <SingleLayout>
            <SingleCanvasColumn>
              <ToolGroup>
                <ToolGroupLabel>Zoom</ToolGroupLabel>
                {ZOOM_LEVELS.map((z) => (
                  <ModeButton key={z} type="button" $active={zoom === z} aria-pressed={zoom === z} onClick={() => setZoom(z)}>
                    {z === 1 ? "Ajustar" : `${z}×`}
                  </ModeButton>
                ))}
              </ToolGroup>
              {selected.status === "no-path" && (
                <StatusBanner $ok={false}>
                  <strong>{selected.label} não encontrou caminho</strong> entre o início e o destino. As
                  células exploradas mostram a região alcançada.
                </StatusBanner>
              )}
              <MazeCanvas grid={grid} result={selected} showExplored={showExplored} zoom={zoom} editable={false} />
            </SingleCanvasColumn>
            <MazeResultCard result={selected} optimal={optimal} />
          </SingleLayout>
        )
      )}
    </>
  );
}

export default MazeResultsView;
