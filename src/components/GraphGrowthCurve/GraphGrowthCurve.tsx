import { useEffect, useRef, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "react-toastify";
import { GRAPH_ALGORITHMS, GRAPH_ALGORITHM_IDS } from "../../graph/algorithms/registry";
import { GRAPH_ALGORITHM_COLORS } from "../../graph/algorithms/colors";
import type { GraphAlgorithmId } from "../../graph/algorithms/types";
import { GROWTH_SIZES } from "../../graph/benchmark/runner";
import type { GrowthPoint } from "../../graph/benchmark/runner";
import { runGraphRequests } from "../../graph/benchmark/client";
import { AlgorithmCheckboxList, BenchmarkParagraph, CheckboxRow, StartBenchmarkButton, SkippedReason } from "../../pages/styles";
import { ActionButton, ControlsRow, FieldHint } from "../../pages/mazeStyles";
import { fmtInt, fmtMs } from "../MazeResults/format";

const DEFAULT: Record<GraphAlgorithmId, boolean> = {
  dijkstra: true,
  bellmanFord: true,
  bfs: false,
  dagShortestPath: false,
  dijkstraTarget: true,
  astar: true,
  bidirectionalDijkstra: true,
  floydWarshall: false,
  johnson: false,
  duanSssp: false,
};

/** BFS e DAG nunca são compatíveis com o grafo da curva (pesos distintos, não direcionado). */
const AVAILABLE = GRAPH_ALGORITHM_IDS.filter((id) => id !== "bfs" && id !== "dagShortestPath");

/**
 * Curva de crescimento: mesmo tipo de grafo (geométrico, E ≈ 3V, pesos ≥ 1)
 * em tamanhos crescentes, mesma semente para todos os algoritmos. Não usa o
 * grafo do editor. Cada algoritmo roda em um worker próprio.
 */
function GraphGrowthCurve() {
  const [selected, setSelected] = useState(DEFAULT);
  const [points, setPoints] = useState<GrowthPoint[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelRef.current?.(), []);

  const ids = AVAILABLE.filter((id) => selected[id]);

  const start = () => {
    const seed = Math.floor(Math.random() * 1e6) + 1;
    const sizes = [...GROWTH_SIZES];
    setPoints([]);
    let done = 0;
    const total = ids.length * sizes.length;
    setProgress(`0/${total}`);
    cancelRef.current = runGraphRequests(
      ids.map((algorithmId) => ({ type: "growth", job: { algorithmId, sizes, seed, samples: 3 } })),
      {
        onMessage: (msg) => {
          if (msg.type === "growthPoint") {
            done++;
            setPoints((p) => [...p, msg.point]);
            setProgress(`${done}/${total}`);
          } else if (msg.type === "error") {
            toast.error(msg.message);
          }
        },
        onDone: () => {
          cancelRef.current = null;
          setProgress(null);
        },
        onFatal: (m) => {
          cancelRef.current = null;
          setProgress(null);
          toast.error(m);
        },
      }
    );
  };

  const cancel = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setProgress(null);
  };

  const rows = GROWTH_SIZES.map((n) => {
    const row: Record<string, number> = { n };
    for (const p of points) if (p.n === n && p.medianMs != null) row[p.algorithmId] = p.medianMs;
    return row;
  });
  const plotted = AVAILABLE.filter((id) => points.some((p) => p.algorithmId === id && p.medianMs != null));
  const skipped = points.filter((p) => p.medianMs == null);
  const measured = points.flatMap((p) => (p.medianMs != null ? [p.medianMs] : []));
  // Domínio log em potências de 10 que englobam todos os pontos.
  const yDomain: [number, number] = measured.length
    ? [10 ** Math.floor(Math.log10(Math.min(...measured))), 10 ** Math.ceil(Math.log10(Math.max(...measured) * 1.0001))]
    : [0.001, 1];

  return (
    <>
      <BenchmarkParagraph>
        Gera grafos geométricos não direcionados (cada vértice ligado aos 3 vizinhos mais próximos, pesos ≥ 1, conexos)
        com |V| ∈ {GROWTH_SIZES.map(fmtInt).join(", ")}. Origem = vértice 0; destino = o vértice mais distante em saltos.
        Todos os algoritmos medem exatamente os mesmos grafos (mesma semente), com aquecimento e 3 amostras.
      </BenchmarkParagraph>
      <AlgorithmCheckboxList style={{ flexDirection: "row", flexWrap: "wrap", gap: "10px 18px" }}>
        {AVAILABLE.map((id) => (
          <CheckboxRow key={id}>
            <input
              type="checkbox"
              checked={selected[id]}
              disabled={!!progress}
              onChange={(e) => setSelected((s) => ({ ...s, [id]: e.target.checked }))}
            />
            <span style={{ color: GRAPH_ALGORITHM_COLORS[id] }}>●</span>
            <span>{GRAPH_ALGORITHMS[id].label}</span>
          </CheckboxRow>
        ))}
      </AlgorithmCheckboxList>
      <ControlsRow>
        <StartBenchmarkButton
          type="button"
          style={{ flex: 1, width: "auto" }}
          onClick={start}
          disabled={!!progress || ids.length === 0}
        >
          {progress ? `Calculando… ${progress} pontos` : "Rodar curva de crescimento"}
        </StartBenchmarkButton>
        {progress && (
          <ActionButton type="button" $variant="secondary" onClick={cancel}>
            Cancelar
          </ActionButton>
        )}
      </ControlsRow>

      {plotted.length > 0 && (
        <div style={{ width: "100%", height: 340 }}>
          <ResponsiveContainer>
            <LineChart data={rows} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="n"
                type="number"
                scale="log"
                domain={[GROWTH_SIZES[0], GROWTH_SIZES[GROWTH_SIZES.length - 1]]}
                ticks={[...GROWTH_SIZES]}
                tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))}
                stroke="#ccc"
                tick={{ fill: "#ccc", fontSize: 11 }}
                label={{ value: "|V| (escala log)", position: "bottom", offset: 2, fill: "#aaa", fontSize: 12 }}
              />
              <YAxis
                scale="log"
                domain={yDomain}
                stroke="#ccc"
                width={70}
                tick={{ fill: "#ccc", fontSize: 11 }}
                tickFormatter={(v: number) => fmtMs(v)}
              />
              <Tooltip
                contentStyle={{ background: "#2a2a2a", border: "1px solid #555" }}
                labelStyle={{ color: "#eee", fontWeight: 600 }}
                labelFormatter={(v) => `|V| = ${fmtInt(Number(v))}`}
                formatter={(v, name) => [fmtMs(Number(v)), GRAPH_ALGORITHMS[name as GraphAlgorithmId]?.label ?? name]}
              />
              <Legend
                formatter={(v: string) => GRAPH_ALGORITHMS[v as GraphAlgorithmId]?.label ?? v}
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              />
              {plotted.map((id) => (
                <Line
                  key={id}
                  dataKey={id}
                  stroke={GRAPH_ALGORITHM_COLORS[id]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {plotted.length > 0 && (
        <FieldHint>
          Eixos em escala logarítmica: inclinação ≈ 1 indica crescimento linear; ≈ 3, cúbico (Floyd-Warshall). Tempos de
          problemas diferentes (origem única, origem → destino, todos os pares) não são diretamente comparáveis.
        </FieldHint>
      )}
      {skipped.map((p) => (
        <SkippedReason key={`${p.algorithmId}-${p.n}`}>
          <strong>
            {GRAPH_ALGORITHMS[p.algorithmId].label}, |V| = {fmtInt(p.n)}:
          </strong>{" "}
          não executado — {p.skippedReason}
        </SkippedReason>
      ))}
    </>
  );
}

export default GraphGrowthCurve;
