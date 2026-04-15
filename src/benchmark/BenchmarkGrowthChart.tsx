import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GrowthCurveResult } from "./growthBenchmark";
import { ALGORITHM_CHART_COLORS } from "./chartColors";

type Row = {
  V: number;
  Vlabel: string;
  Dijkstra?: number;
  "Bellman-Ford"?: number;
};

function formatV(n: number): string {
  if (n >= 1000) return `${n / 1000}k`;
  return String(n);
}

export default function BenchmarkGrowthChart({ data }: { data: GrowthCurveResult }) {
  const rows: Row[] = data.points.map((p) => {
    const row: Row = {
      V: p.vertexCount,
      Vlabel: formatV(p.vertexCount),
    };
    if (p.dijkstraUs != null) row.Dijkstra = p.dijkstraUs;
    if (p.bellmanFordUs != null) row["Bellman-Ford"] = p.bellmanFordUs;
    return row;
  });

  const hasDijkstra = data.points.some((p) => p.dijkstraUs != null);
  const hasBf = data.points.some((p) => p.bellmanFordUs != null);

  return (
    <div style={{ width: "100%" }}>
      <h4
        style={{
          margin: "0 0 4px",
          fontSize: 15,
          fontWeight: 600,
          color: "#fff",
        }}
      >
        Curva de crescimento (grafo esparso)
      </h4>
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 12,
          lineHeight: 1.45,
          color: "#9a9a9a",
        }}
      >
        Para cada |V|, um grafo esparso aleatório (E ≈ V), origem no vértice 0. Eixo Y:
        tempo médio por execução (µs), escala logarítmica para comparar ordens de grandeza.
      </p>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <LineChart
            data={rows}
            margin={{ top: 8, right: 16, left: 8, bottom: 24 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis
              dataKey="Vlabel"
              stroke="#ccc"
              tick={{ fill: "#ccc", fontSize: 11 }}
              label={{
                value: "|V| (vértices)",
                position: "bottom",
                offset: -2,
                fill: "#aaa",
                fontSize: 12,
              }}
            />
            <YAxis
              stroke="#ccc"
              scale="log"
              domain={["auto", "auto"]}
              tick={{ fill: "#ccc", fontSize: 11 }}
              tickFormatter={(v) => `${Number(v).toFixed(0)} µs`}
              label={{
                value: "Tempo médio (µs, log)",
                angle: -90,
                position: "insideLeft",
                fill: "#aaa",
                fontSize: 12,
              }}
            />
            <Tooltip
              contentStyle={{
                background: "#2a2a2a",
                border: "1px solid #555",
                color: "#fff",
              }}
              formatter={(value) => {
                const v = Number(value);
                if (!Number.isFinite(v)) return ["—", ""];
                return [
                  `${v.toFixed(2)} µs (${(v / 1000).toFixed(6)} ms)`,
                  "Tempo médio",
                ];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, alignItems: "start", bottom: "-5px" }} />
            {hasDijkstra && (
              <Line
                type="monotone"
                dataKey="Dijkstra"
                stroke={ALGORITHM_CHART_COLORS.dijkstra}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
              />
            )}
            {hasBf && (
              <Line
                type="monotone"
                dataKey="Bellman-Ford"
                stroke={ALGORITHM_CHART_COLORS.bellmanFord}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
