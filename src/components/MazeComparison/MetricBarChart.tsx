import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard, ChartTitle, ChartNote } from "./styles";

export type MetricRow = {
  id: string;
  label: string;
  color: string;
  /** `null` = métrica indisponível (ex.: sem caminho, sem referência). */
  value: number | null;
  /** Motivo exibido quando `value` é null. */
  missingReason?: string;
};

type Props = {
  title: string;
  note?: string;
  rows: MetricRow[];
  format: (v: number) => string;
  /** Escala logarítmica (útil quando os valores diferem em ordens de grandeza). */
  log?: boolean;
  emptyMessage?: string;
};

/** Gráfico de barras de uma métrica por algoritmo (cada linha traz a cor do algoritmo). */
function MetricBarChart({ title, note, rows, format, log, emptyMessage }: Props) {
  const data = rows.filter((r) => r.value != null) as (MetricRow & { value: number })[];
  const missing = rows.filter((r) => r.value == null);
  const useLog = !!log && data.length > 0 && data.every((d) => d.value > 0);
  // Domínio log em potências de 10 que englobam todos os valores (o "auto" do
  // recharts pode cortar barras pequenas).
  const logDomain: [number, number] = useLog
    ? [
        10 ** Math.floor(Math.log10(Math.min(...data.map((d) => d.value)))),
        10 ** Math.ceil(Math.log10(Math.max(...data.map((d) => d.value)) * 1.0001)),
      ]
    : [0, 1];

  return (
    <ChartCard>
      <ChartTitle>{title}</ChartTitle>
      {note && <ChartNote>{useLog ? `${note} Escala logarítmica.` : note}</ChartNote>}
      {data.length === 0 ? (
        <ChartNote>{emptyMessage ?? "Nenhum algoritmo tem esta métrica."}</ChartNote>
      ) : (
        <div style={{ width: "100%", height: 230 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 22, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#ccc"
                tick={{ fill: "#ccc", fontSize: 11 }}
                interval={0}
                tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 11)}…` : v)}
              />
              <YAxis
                stroke="#ccc"
                tick={{ fill: "#ccc", fontSize: 11 }}
                width={64}
                scale={useLog ? "log" : "auto"}
                domain={useLog ? logDomain : [0, "auto"]}
                tickFormatter={(v: number) => format(v)}
              />
              <Tooltip
                contentStyle={{ background: "#2A2A2A", border: "1px solid #555" }}
                itemStyle={{ color: "#fff" }}
                labelStyle={{ color: "#ddd" }}
                cursor={{ fill: "#5c5b5b", opacity: 0.2 }}
                formatter={(value) => [format(Number(value)), title]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false} minPointSize={2}>
                {data.map((d) => (
                  <Cell key={d.id} fill={d.color} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  fill="#ddd"
                  fontSize={11}
                  formatter={(v: unknown) => format(Number(v))}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {missing.length > 0 && data.length > 0 && (
        <ChartNote>
          Sem valor:{" "}
          {missing.map((m) => `${m.label}${m.missingReason ? ` (${m.missingReason})` : ""}`).join(", ")}
        </ChartNote>
      )}
    </ChartCard>
  );
}

export default MetricBarChart;
