import { forceLayout, normalizePositions } from "./force";
export { forceLayout, normalizePositions };

export type LayoutKind = "auto" | "force" | "layered" | "circle" | "grid";

export const LAYOUT_LABELS: Record<LayoutKind, string> = {
  auto: "Automático",
  force: "Forças (geral)",
  layered: "Camadas (DAG)",
  circle: "Círculo",
  grid: "Grade",
};

const SPACING = 130;

export function circleLayout(n: number): Float64Array {
  const pos = new Float64Array(2 * n);
  const R = Math.max(140, (SPACING * n) / (2 * Math.PI));
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    pos[2 * i] = R + R * Math.cos(a);
    pos[2 * i + 1] = R + R * Math.sin(a);
  }
  return pos;
}

export function gridLayout(n: number, cols = Math.ceil(Math.sqrt(n))): Float64Array {
  const pos = new Float64Array(2 * n);
  for (let i = 0; i < n; i++) {
    pos[2 * i] = (i % cols) * SPACING;
    pos[2 * i + 1] = Math.floor(i / cols) * SPACING;
  }
  return pos;
}

/**
 * Layout em camadas para grafos acíclicos (estilo Sugiyama simplificado):
 * 1. camada = maior distância em arcos a partir de uma fonte (longest path);
 * 2. ordem dentro da camada por baricentro dos vizinhos, varrendo para baixo e
 *    para cima várias vezes — reduz cruzamentos de arestas;
 * 3. arcos apontam sempre para camadas abaixo.
 * Para grafos com ciclo, cai no layout por forças.
 */
export function layeredLayout(n: number, arcs: Array<[number, number]>): Float64Array {
  const out: number[][] = Array.from({ length: n }, () => []);
  const inn: number[][] = Array.from({ length: n }, () => []);
  const indeg = new Int32Array(n);
  for (const [u, v] of arcs) {
    if (u === v) continue;
    out[u].push(v);
    inn[v].push(u);
    indeg[v]++;
  }
  const order: number[] = [];
  for (let v = 0; v < n; v++) if (indeg[v] === 0) order.push(v);
  for (let h = 0; h < order.length; h++) {
    for (const v of out[order[h]]) if (--indeg[v] === 0) order.push(v);
  }
  if (order.length < n) return forceLayout(n, arcs);

  const layer = new Int32Array(n);
  for (const u of order) for (const v of out[u]) layer[v] = Math.max(layer[v], layer[u] + 1);
  const depth = n ? Math.max(...layer) + 1 : 0;
  const layers: number[][] = Array.from({ length: depth }, () => []);
  for (const u of order) layers[layer[u]].push(u);

  const rank = new Float64Array(n);
  const refresh = (l: number[]) => l.forEach((v, i) => (rank[v] = i - (l.length - 1) / 2));
  layers.forEach(refresh);
  const sweep = (l: number[], neighbors: number[][]) => {
    const key = new Map<number, number>();
    for (const v of l) {
      const nb = neighbors[v];
      key.set(v, nb.length ? nb.reduce((s, u) => s + rank[u], 0) / nb.length : rank[v]);
    }
    l.sort((a, b) => key.get(a)! - key.get(b)!);
    refresh(l);
  };
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 1; i < depth; i++) sweep(layers[i], inn);
    for (let i = depth - 2; i >= 0; i--) sweep(layers[i], out);
  }

  const pos = new Float64Array(2 * n);
  for (let i = 0; i < depth; i++) {
    for (const v of layers[i]) {
      pos[2 * v] = rank[v] * SPACING;
      pos[2 * v + 1] = i * SPACING * 1.1;
    }
  }
  return normalizePositions(pos);
}

/** Escolha automática: camadas para DAG dirigido, círculo para poucos vértices, forças no resto. */
export function chooseLayout(n: number, isDirectedAcyclic: boolean): Exclude<LayoutKind, "auto"> {
  if (n <= 1) return "grid";
  if (isDirectedAcyclic && n <= 3000) return "layered";
  if (n <= 8) return "circle";
  return "force";
}

export function computeLayout(
  kind: Exclude<LayoutKind, "auto">,
  n: number,
  arcs: Array<[number, number]>
): Float64Array {
  switch (kind) {
    case "circle":
      return circleLayout(n);
    case "grid":
      return gridLayout(n);
    case "layered":
      return layeredLayout(n, arcs);
    case "force":
      return forceLayout(n, arcs);
  }
}

/** Número de pares de segmentos que se cruzam (O(E²); para testes e grafos pequenos). */
export function countCrossings(pos: Float64Array, segments: Array<[number, number]>): number {
  const orient = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
  let crossings = 0;
  for (let i = 0; i < segments.length; i++) {
    const [a, b] = segments[i];
    for (let j = i + 1; j < segments.length; j++) {
      const [c, d] = segments[j];
      if (a === c || a === d || b === c || b === d) continue;
      const P = (v: number) => [pos[2 * v], pos[2 * v + 1]] as const;
      const [ax, ay] = P(a);
      const [bx, by] = P(b);
      const [cx, cy] = P(c);
      const [dx, dy] = P(d);
      if (
        orient(ax, ay, bx, by, cx, cy) * orient(ax, ay, bx, by, dx, dy) < 0 &&
        orient(cx, cy, dx, dy, ax, ay) * orient(cx, cy, dx, dy, bx, by) < 0
      ) {
        crossings++;
      }
    }
  }
  return crossings;
}
