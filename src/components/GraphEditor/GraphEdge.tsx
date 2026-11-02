import { memo, useCallback } from "react";
import { BaseEdge, EdgeLabelRenderer, useStore } from "reactflow";
import type { EdgeProps, ReactFlowState } from "reactflow";
import { EdgeLabel } from "./styles";

export type GraphEdgeData = {
  weight: number;
  bidirectional?: boolean;
  /** Deslocamento perpendicular (px) para separar arestas entre o mesmo par de nós. */
  offset?: number;
  showLabel?: boolean;
  highlightColor?: string | null;
};

/** Centro e raio do nó, a partir do estado interno do React Flow. */
function useNodeGeometry(id: string) {
  return useStore(
    useCallback(
      (s: ReactFlowState) => {
        const n = s.nodeInternals.get(id);
        if (!n?.positionAbsolute || !n.width || !n.height) return null;
        return {
          x: n.positionAbsolute.x + n.width / 2,
          y: n.positionAbsolute.y + n.height / 2,
          r: Math.max(n.width, n.height) / 2,
        };
      },
      [id]
    ),
    (a, b) => a?.x === b?.x && a?.y === b?.y && a?.r === b?.r
  );
}

/**
 * Aresta "flutuante": liga as bordas dos círculos pelo segmento entre os
 * centros (independe de qual ponto de conexão foi usado), o que evita os
 * degraus e sobreposições do traçado antigo. Arestas paralelas/opostas viram
 * curvas com deslocamentos diferentes.
 */
function GraphEdge({ id, source, target, data, markerEnd, selected, interactionWidth }: EdgeProps<GraphEdgeData>) {
  const s = useNodeGeometry(source);
  const t = useNodeGeometry(target);
  if (!s || !t) return null;

  const dx = t.x - s.x;
  const dy = t.y - s.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const offset = data?.offset ?? 0;
  // Ponto de controle da curva (no meio, deslocado na perpendicular).
  const cx = (s.x + t.x) / 2 + nx * offset * 2;
  const cy = (s.y + t.y) / 2 + ny * offset * 2;
  const trim = (from: { x: number; y: number; r: number }, toX: number, toY: number, extra: number) => {
    const ux = toX - from.x;
    const uy = toY - from.y;
    const l = Math.hypot(ux, uy) || 1;
    return { x: from.x + (ux / l) * (from.r + extra), y: from.y + (uy / l) * (from.r + extra) };
  };
  const start = trim(s, cx, cy, 1);
  const end = trim(t, cx, cy, markerEnd ? 3 : 1);
  const path = offset
    ? `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`
    : `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  // Ponto médio da curva quadrática (t = 0,5).
  const lx = offset ? 0.25 * start.x + 0.5 * cx + 0.25 * end.x : (start.x + end.x) / 2;
  const ly = offset ? 0.25 * start.y + 0.5 * cy + 0.25 * end.y : (start.y + end.y) / 2;

  const highlight = data?.highlightColor ?? null;
  const stroke = highlight ?? (selected ? "#ffffff" : "#8b93a7");

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={interactionWidth ?? 18}
        style={{ stroke, strokeWidth: highlight ? 3.5 : selected ? 2.5 : 1.6 }}
      />
      {data?.showLabel && (
        <EdgeLabelRenderer>
          <EdgeLabel
            style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}
            $highlight={highlight}
            $selected={!!selected}
          >
            {data.weight}
          </EdgeLabel>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(GraphEdge);
