import { memo } from "react";
import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";
import { NodeCircle } from "./styles";

export type GraphNodeData = {
  label: string;
  role?: "source" | "target" | "both" | null;
  /** Cor do caminho destacado, se o nó faz parte dele. */
  pathColor?: string | null;
};

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];

/**
 * Nó circular. Os quatro pontos de conexão são do tipo "source" e o editor usa
 * ConnectionMode.Loose: arrastar de qualquer ponto até outro nó cria a aresta.
 */
function GraphNode({ data, selected }: NodeProps<GraphNodeData>) {
  return (
    <NodeCircle $selected={selected} $role={data.role ?? null} $pathColor={data.pathColor ?? null} title={data.label}>
      <span>{data.label}</span>
      {SIDES.map((side) => (
        <Handle key={side} id={side} type="source" position={side} className="graph-handle" />
      ))}
    </NodeCircle>
  );
}

export default memo(GraphNode);
