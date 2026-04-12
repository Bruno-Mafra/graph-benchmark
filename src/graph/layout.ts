import type { Node } from "reactflow";

const DEFAULT_CENTER = { x: 420, y: 320 };

/** Distribui os nós em círculo (evita sobreposição para grafos arbitrários). */
export function layoutNodesCircle(
  nodes: Node[],
  center = DEFAULT_CENTER
): Node[] {
  const n = nodes.length;
  if (n === 0) return nodes;
  const R = Math.max(130, 32 * Math.sqrt(n));

  return nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      ...node,
      position: {
        x: center.x + R * Math.cos(angle),
        y: center.y + R * Math.sin(angle),
      },
    };
  });
}

/** Nós em linha horizontal. */
export function layoutNodesLine(nodes: Node[], spacing = 102, y = 280): Node[] {
  return nodes.map((node, i) => ({
    ...node,
    position: { x: 60 + i * spacing, y },
  }));
}

/** Espaçamento padrão entre centros dos nós em layout de grade (mapa). */
export const GRID_LAYOUT_CELL = 118;

/** Grade visual: índice i vai para (row, col) com `cols` colunas. */
export function layoutNodesGrid(
  nodes: Node[],
  cols: number,
  cell = GRID_LAYOUT_CELL,
  origin = { x: 48, y: 52 }
): Node[] {
  if (cols < 1) return layoutNodesCircle(nodes);
  return nodes.map((node, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    return {
      ...node,
      position: { x: origin.x + c * cell, y: origin.y + r * cell },
    };
  });
}
