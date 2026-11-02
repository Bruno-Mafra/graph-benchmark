import { useState } from "react";
import { toast } from "react-toastify";
import SimpleModal from "../SimpleModal/SimpleModal";
import { Field, Label, Input } from "../SimpleModal/styles";
import { buildPreset } from "../../graph/generators";
import type { GeneratedGraph, PresetKind, WeightMode } from "../../graph/generators";
import { GRAPH_VIEW_LIMITS, needsCanvasView } from "../../graph/config";
import { CheckboxRow } from "../../pages/styles";

type KindOption = { value: PresetKind; label: string; hint: string; max: number };

const MAX = GRAPH_VIEW_LIMITS.presetMaxNodes;

const KIND_OPTIONS: KindOption[] = [
  { value: "sparse", label: "Esparso dirigido (E ≈ 2V)", hint: "Todos os vértices alcançáveis a partir do 0.", max: MAX },
  { value: "geometric", label: "Geométrico não direcionado", hint: "Pontos no plano ligados aos 3 vizinhos mais próximos; peso ∝ distância. Ideal para A*.", max: MAX },
  { value: "dense", label: "Denso dirigido (E ≈ 0,6·V²)", hint: "Muitas arestas: use poucos vértices.", max: 60 },
  { value: "grid", label: "Grade (mapa)", hint: "4 vizinhos por célula, arestas não direcionadas.", max: 70 },
  { value: "linear", label: "Cadeia", hint: "0 → 1 → … → n−1.", max: MAX },
  { value: "dag", label: "DAG (acíclico)", hint: "Acíclico, todos alcançáveis a partir do 0; com pesos aleatórios, ~30% negativos.", max: MAX },
  { value: "negativeWeights", label: "Pesos negativos sem ciclo negativo", hint: "Válido para Bellman-Ford, Johnson e Floyd-Warshall.", max: MAX },
  { value: "negativeCycle", label: "Com ciclo negativo", hint: "Ciclo 0 → 1 → 2 → 0 de soma −3, alcançável a partir do 0.", max: MAX },
  { value: "disconnected", label: "Desconexo", hint: "Duas componentes: a segunda é inalcançável a partir do 0.", max: MAX },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (gen: GeneratedGraph, description: string) => void;
};

export default function PresetGraphModal({ open, onClose, onApply }: Props) {
  const [kind, setKind] = useState<PresetKind>("geometric");
  const [n, setN] = useState("30");
  const [rows, setRows] = useState("6");
  const [cols, setCols] = useState("8");
  const [unit, setUnit] = useState(false);
  const option = KIND_OPTIONS.find((o) => o.value === kind)!;
  const unitDisabled = kind === "negativeWeights" || kind === "negativeCycle";

  const handleConfirm = () => {
    const parse = (s: string, lo: number, hi: number, name: string) => {
      const v = Number(s);
      if (!Number.isInteger(v) || v < lo || v > hi) {
        toast.warning(`${name} deve ser um inteiro entre ${lo} e ${hi}.`);
        return null;
      }
      return v;
    };
    let gen: GeneratedGraph;
    const weights: WeightMode = unit && !unitDisabled ? "unit" : "random";
    if (kind === "grid") {
      const r = parse(rows, 2, option.max, "Linhas");
      const c = r != null ? parse(cols, 2, option.max, "Colunas") : null;
      if (r == null || c == null) return;
      gen = buildPreset(kind, { n: 0, rows: r, cols: c, weights });
    } else {
      const v = parse(n, kind === "negativeCycle" ? 3 : 2, option.max, "Número de vértices");
      if (v == null) return;
      gen = buildPreset(kind, { n: v, rows: 0, cols: 0, weights });
    }
    const arcs = gen.edges.length;
    onApply(gen, `${option.label}: ${gen.n} vértices, ${arcs} arestas${needsCanvasView(gen.n, arcs) ? " (visualização em Canvas)" : ""}.`);
    onClose();
  };

  return (
    <SimpleModal open={open} title="Modelo pronto" onClose={onClose} onConfirm={handleConfirm} confirmLabel="Gerar grafo">
      <Field>
        <Label htmlFor="preset-kind">Tipo de grafo</Label>
        <select
          id="preset-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as PresetKind)}
          style={{ width: "100%", padding: "8px 10px", fontSize: 14, borderRadius: 6, border: "1px solid #444", background: "#111", color: "#f5f5f5" }}
        >
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#aaa", maxWidth: 380 }}>{option.hint}</p>
      </Field>

      {kind === "grid" ? (
        <div style={{ display: "flex", gap: 12 }}>
          <Field>
            <Label htmlFor="preset-rows">Linhas</Label>
            <Input id="preset-rows" type="number" min={2} max={option.max} value={rows} onChange={(e) => setRows(e.target.value)} />
          </Field>
          <Field>
            <Label htmlFor="preset-cols">Colunas</Label>
            <Input id="preset-cols" type="number" min={2} max={option.max} value={cols} onChange={(e) => setCols(e.target.value)} />
          </Field>
        </div>
      ) : (
        <Field>
          <Label htmlFor="preset-n">Número de vértices (até {option.max.toLocaleString("pt-BR")})</Label>
          <Input id="preset-n" type="number" min={2} max={option.max} value={n} onChange={(e) => setN(e.target.value)} />
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "#888", maxWidth: 380 }}>
            Acima de {GRAPH_VIEW_LIMITS.editorMaxNodes} vértices ou {GRAPH_VIEW_LIMITS.editorMaxEdges} arestas, o grafo é
            exibido em Canvas (somente leitura).
          </p>
        </Field>
      )}

      <Field>
        <CheckboxRow style={{ opacity: unitDisabled ? 0.5 : 1 }}>
          <input type="checkbox" checked={unit && !unitDisabled} disabled={unitDisabled} onChange={(e) => setUnit(e.target.checked)} />
          <span>Pesos unitários (todos = 1; habilita o BFS)</span>
        </CheckboxRow>
      </Field>
    </SimpleModal>
  );
}
