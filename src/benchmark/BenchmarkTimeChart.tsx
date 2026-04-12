import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BenchmarkAlgorithmResult } from "./runBenchmark";
import { chartColorForAlgorithm } from "./chartColors";

type Row = {
  name: string;
  tempoUs: number;
  algorithmId: BenchmarkAlgorithmResult["algorithmId"];
};

export default function BenchmarkTimeChart({
  results,
}: {
  results: BenchmarkAlgorithmResult[];
}) {
  const data: Row[] = results
    .filter((r) => !r.skipped && r.avgTimeUs != null)
    .map((r) => ({
      name: r.label,
      tempoUs: r.avgTimeUs!,
      algorithmId: r.algorithmId,
    }))
    .sort((a, b) => a.tempoUs - b.tempoUs);

  if (data.length === 0) return null;

  const legendEntries = [...new Map(data.map((d) => [d.algorithmId, d])).values()];

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
        Tempo médio por execução
      </h4>
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 12,
          lineHeight: 1.45,
          color: "#9a9a9a",
        }}
      >
        Ordenado do mais rápido ao mais lento. Eixo em microssegundos (µs).
      </p>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis
              dataKey="name"
              stroke="#ccc"
              tick={{ fill: "#ccc", fontSize: 12 }}
            />
            <YAxis
              stroke="#ccc"
              tick={{ fill: "#ccc", fontSize: 11 }}
              tickFormatter={(v) => `${v.toFixed(0)} µs`}
              label={{
                value: "Tempo médio (µs)",
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
                if (!Number.isFinite(v)) return ["—", "Tempo médio"];
                return [
                  `${v.toFixed(3)} µs (${(v / 1000).toFixed(6)} ms)`,
                  "Tempo médio",
                ];
              }}
            />
            <Bar dataKey="tempoUs" radius={[4, 4, 0, 0]} name="Tempo">
              {data.map((entry, i) => (
                <Cell
                  key={`${entry.algorithmId}-${i}`}
                  fill={chartColorForAlgorithm(entry.algorithmId, i)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "14px 20px",
          marginTop: 12,
          justifyContent: "center",
        }}
      >
        {legendEntries.map((d, i) => (
          <span
            key={d.algorithmId}
            style={{
              fontSize: 12,
              color: "#ccc",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: chartColorForAlgorithm(d.algorithmId, i),
                flexShrink: 0,
              }}
            />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}
