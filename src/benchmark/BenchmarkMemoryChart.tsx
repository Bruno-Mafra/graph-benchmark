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
  algorithmId: BenchmarkAlgorithmResult["algorithmId"];
  /** Valor principal no eixo Y */
  valueMb: number;
  /** true = variação desde medição anterior; false = heap absoluto */
  isDelta: boolean;
};

export default function BenchmarkMemoryChart({
  results,
}: {
  results: BenchmarkAlgorithmResult[];
}) {
  const raw = results.filter((r) => !r.skipped);

  const prefersDelta = raw.some((r) => r.heapDeltaBytes != null);

  const data: Row[] = raw.map((r) => {
    const hasDelta = r.heapDeltaBytes != null;
    const bytes =
      prefersDelta && hasDelta
        ? r.heapDeltaBytes!
        : r.heapUsedAfterBytes ?? 0;
    return {
      name: r.label,
      algorithmId: r.algorithmId,
      valueMb: bytes / (1024 * 1024),
      isDelta: prefersDelta && hasDelta,
    };
  });

  if (data.length === 0) return null;

  const uaMode = raw.some((r) => r.memoryMeasurementMode === "measureUA");

  const yLabel = prefersDelta
    ? uaMode
      ? "Δ memória (MB)"
      : "Δ heap (MB)"
    : uaMode
      ? "Memória UA (MB)"
      : "Heap usado (MB)";

  const title = prefersDelta
    ? uaMode
      ? "Variação de memória (entre medições)"
      : "Variação de heap JS (entre medições)"
    : uaMode
      ? "Memória após a execução instrumentada"
      : "Heap JS após a execução instrumentada";

  const subtitle = uaMode
    ? prefersDelta
      ? "Medição via performance.measureUserAgentSpecificMemory() (Chrome). Δ entre leituras consecutivas; GC opcional (--expose-gc) pode estabilizar."
      : "Estimativa do user agent (bytes totais). Requer HTTPS ou localhost no Chrome."
    : prefersDelta
      ? "Chrome (performance.memory). Δ = usedJSHeapSize entre medições; pode ser negativo após GC."
      : "Chrome: usedJSHeapSize após o algoritmo. Fora do Chrome costuma ficar vazio ou 0.";

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
        {title}
      </h4>
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 12,
          lineHeight: 1.45,
          color: "#9a9a9a",
        }}
      >
        {subtitle}
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
              tickFormatter={(v) => `${v.toFixed(2)}`}
              label={{
                value: yLabel,
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
              formatter={(value, _name, props) => {
                const v = Number(value);
                const row = props?.payload as Row | undefined;
                const unit = row?.isDelta ? "Δ MB" : "MB";
                if (!Number.isFinite(v)) return ["—", unit];
                const sign = row?.isDelta && v > 0 ? "+" : "";
                return [`${sign}${v.toFixed(3)} ${unit}`, "Memória"];
              }}
            />
            <Bar dataKey="valueMb" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => (
                <Cell
                  key={d.algorithmId}
                  fill={chartColorForAlgorithm(d.algorithmId, i)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
