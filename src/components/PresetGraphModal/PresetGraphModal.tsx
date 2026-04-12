import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import type { Node, Edge } from "reactflow";
import SimpleModal from "../SimpleModal/SimpleModal";
import { Field, Label, Input } from "../SimpleModal/styles";
import {
  buildPresetGraph,
  type PresetKind,
} from "../../graph/adjacencyToReactFlow";

const LIMITS = {
  nSparse: { min: 2, max: 3000 },
  nDense: { min: 2, max: 45 },
  nLinear: { min: 2, max: 5000 },
  grid: { min: 2, max: 45 },
};

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (nodes: Node[], edges: Edge[]) => void;
};

const KIND_OPTIONS: { value: PresetKind; label: string; hint: string }[] = [
  { value: "sparse", label: "Esparso (E ≈ V)", hint: "Uma aresta aleatória saindo de cada vértice" },
  { value: "dense", label: "Denso (E ≈ V²)", hint: "Todas as direções i≠j (use n moderado)" },
  { value: "linear", label: "Linear (cadeia)", hint: "Caminho 0→1→…→n−1" },
  { value: "grid", label: "Grade (mapa)", hint: "4-vizinhança em uma grade rows×cols" },
  { value: "negativeWeights", label: "Pesos negativos (esparsos)", hint: "Parte das arestas com peso negativo" },
  { value: "negativeCycle", label: "Ciclo negativo", hint: "Esparso + ciclo 0→1→2→0" },
  { value: "disconnected", label: "Desconexo", hint: "Metade dos vértices sem arestas de saída" },
];

export default function PresetGraphModal({ open, onClose, onApply }: Props) {
  const [kind, setKind] = useState<PresetKind>("sparse");
  const [n, setN] = useState(16);
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);

  const clamp = (v: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, v));

  const handleConfirm = useCallback(() => {
    if (kind === "grid") {
      const r = clamp(Math.floor(rows), LIMITS.grid.min, LIMITS.grid.max);
      const c = clamp(Math.floor(cols), LIMITS.grid.min, LIMITS.grid.max);
      if (r * c > 800) {
        toast.warning("Grades muito grandes podem deixar o editor lento. Gerando mesmo assim.");
      }
      const { nodes, edges } = buildPresetGraph(kind, { n: 0, rows: r, cols: c });
      onApply(nodes, edges);
      onClose();
      return;
    }

    let lo = LIMITS.nSparse.min;
    let hi = LIMITS.nSparse.max;
    if (kind === "dense") {
      lo = LIMITS.nDense.min;
      hi = LIMITS.nDense.max;
    } else if (kind === "linear") {
      lo = LIMITS.nLinear.min;
      hi = LIMITS.nLinear.max;
    }

    const nv = clamp(Math.floor(n), lo, hi);
    if (kind === "dense" && nv > 35) {
      toast.warning("Grafos densos crescem muito em arestas; prefira n ≤ 35 no editor.");
    }
    if (nv >= 1500) {
      toast.warning("Grafos muito grandes podem travar o navegador no React Flow.");
    }

    const { nodes, edges } = buildPresetGraph(kind, {
      n: nv,
      rows: 0,
      cols: 0,
    });
    onApply(nodes, edges);
    onClose();
  }, [kind, n, rows, cols, onApply, onClose]);

  const selected = KIND_OPTIONS.find((o) => o.value === kind);

  return (
    <SimpleModal
      open={open}
      title="Modelo pronto"
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmLabel="Gerar grafo"
      cancelLabel="Cancelar"
    >
      <Field>
        <Label htmlFor="preset-kind">Tipo de grafo</Label>
        <select
          id="preset-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as PresetKind)}
          style={{
            width: "100%",
            padding: "8px 10px",
            fontSize: 14,
            borderRadius: 6,
            border: "1px solid #444",
            background: "#111",
            color: "#f5f5f5",
          }}
        >
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {selected && (
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#aaa" }}>
            {selected.hint}
          </p>
        )}
      </Field>

      {kind === "grid" ? (
        <>
          <Field>
            <Label htmlFor="preset-rows">Linhas (rows)</Label>
            <Input
              id="preset-rows"
              type="number"
              min={LIMITS.grid.min}
              max={LIMITS.grid.max}
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
            />
          </Field>
          <Field>
            <Label htmlFor="preset-cols">Colunas (cols)</Label>
            <Input
              id="preset-cols"
              type="number"
              min={LIMITS.grid.min}
              max={LIMITS.grid.max}
              value={cols}
              onChange={(e) => setCols(Number(e.target.value))}
            />
          </Field>
        </>
      ) : (
        <Field>
          <Label htmlFor="preset-n">Número de vértices (n)</Label>
          <Input
            id="preset-n"
            type="number"
            min={
              kind === "dense"
                ? LIMITS.nDense.min
                : kind === "linear"
                  ? LIMITS.nLinear.min
                  : LIMITS.nSparse.min
            }
            max={
              kind === "dense"
                ? LIMITS.nDense.max
                : kind === "linear"
                  ? LIMITS.nLinear.max
                  : LIMITS.nSparse.max
            }
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
          />
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "#888" }}>
            {kind === "dense" &&
              `Máx. sugerido no editor: ${LIMITS.nDense.max} (denso = muitas arestas).`}
            {kind === "linear" && `Até ${LIMITS.nLinear.max} vértices na cadeia.`}
            {(kind === "sparse" ||
              kind === "negativeWeights" ||
              kind === "negativeCycle" ||
              kind === "disconnected") &&
              `Até ${LIMITS.nSparse.max} vértices.`}
          </p>
        </Field>
      )}
    </SimpleModal>
  );
}
