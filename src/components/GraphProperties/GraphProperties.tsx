import styled from "styled-components";
import type { GraphAnalysis } from "../../graph/analysis";
import { fmtInt, fmtNumber } from "../MazeResults/format";

const Chips = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 8px;
`;

const Chip = styled.div<{ $tone: "neutral" | "good" | "warn" | "bad" }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #202024;
  border: 1px solid
    ${({ $tone }) => ($tone === "bad" ? "#8b3a3a" : $tone === "warn" ? "#8b6914" : $tone === "good" ? "#2f6b45" : "#333")};

  span {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #8b8b9a;
  }

  strong {
    font-size: 14px;
    color: #ececf2;
    font-variant-numeric: tabular-nums;
  }

  small {
    font-size: 11px;
    color: #a0a0ae;
    line-height: 1.35;
  }
`;

const DIRECTEDNESS = {
  empty: "Sem arestas",
  directed: "Direcionado",
  undirected: "Não direcionado",
  mixed: "Misto",
} as const;

/** Propriedades que determinam quais algoritmos podem rodar. */
function GraphProperties({ analysis, labels, danglingEdges }: { analysis: GraphAnalysis; labels: string[]; danglingEdges: number }) {
  const a = analysis;
  const cycle = a.negativeCycle.status === "found" ? a.negativeCycle.cycle : null;
  const cycleText = (c: number[]) =>
    (c.length > 8 ? [...c.slice(0, 7).map((v) => labels[v]), "…"] : [...c, c[0]].map((v) => labels[v])).join(" → ");

  return (
    <Chips>
      <Chip $tone="neutral">
        <span>Vértices</span>
        <strong>{fmtInt(a.n)}</strong>
        <small>{a.weakComponents} componente(s) fracamente conexa(s)</small>
      </Chip>
      <Chip $tone="neutral">
        <span>Arestas</span>
        <strong>{fmtInt(a.directedEdges + a.undirectedEdges)}</strong>
        <small>
          {fmtInt(a.directedEdges)} direcionada(s), {fmtInt(a.undirectedEdges)} não direcionada(s) · {fmtInt(a.arcs)} arcos
        </small>
      </Chip>
      <Chip $tone="neutral">
        <span>Tipo</span>
        <strong>{DIRECTEDNESS[a.directedness]}</strong>
        <small>
          {a.undirectedEdges > 0
            ? "Arestas não direcionadas valem nos dois sentidos (não é DAG)"
            : a.isDag
              ? "Acíclico (DAG)"
              : `Tem ciclo dirigido${a.cycleExample ? ` (${a.cycleExample.length} vértices)` : ""}`}
        </small>
      </Chip>
      <Chip $tone={a.hasNegative ? "warn" : "good"}>
        <span>Pesos</span>
        <strong>
          {a.minWeight == null
            ? "—"
            : a.uniformWeight != null
              ? `Todos = ${fmtNumber(a.uniformWeight)}`
              : `${fmtNumber(a.minWeight)} a ${fmtNumber(a.maxWeight!)}`}
        </strong>
        <small>
          {a.hasNegative ? "Há pesos negativos" : "Sem pesos negativos"}
          {a.hasZero ? " · há pesos zero" : ""}
        </small>
      </Chip>
      <Chip $tone={cycle ? "bad" : a.negativeCycle.status === "unchecked" ? "warn" : "good"}>
        <span>Ciclo negativo</span>
        <strong>{cycle ? "Sim" : a.negativeCycle.status === "unchecked" ? "Não verificado" : "Não"}</strong>
        <small>
          {cycle
            ? cycleText(cycle)
            : a.negativeCycle.status === "unchecked"
              ? "Grafo grande demais para verificar sem atrasar a interface; o Bellman-Ford detecta ao executar."
              : a.hasNegative
                ? "Pesos negativos, mas nenhum ciclo negativo"
                : "Impossível sem pesos negativos"}
        </small>
      </Chip>
      {danglingEdges > 0 && (
        <Chip $tone="warn">
          <span>Arestas soltas</span>
          <strong>{danglingEdges}</strong>
          <small>Apontam para nós inexistentes e são ignoradas.</small>
        </Chip>
      )}
    </Chips>
  );
}

export default GraphProperties;
