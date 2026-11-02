import type { Node, Edge } from "reactflow";
import { edgeIsBidirectional, edgeWeight, makeEditorEdge, nodeLabel } from "./editorModel";
import { applyPositions } from "./editorBuild";
import { forceLayout } from "./layout";

export const GRAPH_FILE_EXTENSION = ".graph.json";

/** Conteúdo do arquivo JSON aceito pelo import. */
export type GraphFileV1 = {
  version: 1;
  nodes: Array<{
    id: string;
    label: string;
    /** Se omitido, as posições são calculadas automaticamente ao importar. */
    position?: { x: number; y: number };
  }>;
  edges: Array<{
    id?: string;
    source: string;
    target: string;
    weight: number;
    /** Mesmo peso nos dois sentidos (uma aresta visual entre os dois nós). */
    bidirectional?: boolean;
  }>;
};

export function serializeGraphToJson(nodes: Node[], edges: Edge[]): string {
  const ids = new Set(nodes.map((n) => n.id));
  const payload: GraphFileV1 = {
    version: 1,
    nodes: nodes.map((n) => ({
      id: n.id,
      label: nodeLabel(n),
      position: { x: n.position.x, y: n.position.y },
    })),
    // Arestas que apontam para nós removidos não são exportadas (o import as rejeitaria).
    edges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)).map((e) => {
      const weight = edgeWeight(e);
      const bidirectional = edgeIsBidirectional(e);
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        weight,
        ...(bidirectional ? { bidirectional: true } : {}),
      };
    }),
  };
  return JSON.stringify(payload, null, 2);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export type ParseGraphFileResult =
  | { ok: true; nodes: Node[]; edges: Edge[] }
  | { ok: false; error: string };

export function parseGraphFromJson(text: string): ParseGraphFileResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "Arquivo não é um JSON válido." };
  }

  if (!isRecord(data)) {
    return { ok: false, error: "O JSON deve ser um objeto." };
  }

  if (data.version !== 1) {
    return {
      ok: false,
      error: 'Campo "version" deve ser 1 (formato Graph Benchmark v1).',
    };
  }

  if (!Array.isArray(data.nodes)) {
    return { ok: false, error: 'Falta o array "nodes".' };
  }

  if (!Array.isArray(data.edges)) {
    return { ok: false, error: 'Falta o array "edges".' };
  }

  const nodeIds = new Set<string>();
  const nodes: Node[] = [];
  let allNodesHavePosition = true;

  for (let i = 0; i < data.nodes.length; i++) {
    const n = data.nodes[i];
    if (!isRecord(n)) {
      return { ok: false, error: `nodes[${i}] inválido.` };
    }
    if (typeof n.id !== "string" || n.id.trim() === "") {
      return { ok: false, error: `nodes[${i}].id deve ser uma string não vazia.` };
    }
    if (nodeIds.has(n.id)) {
      return { ok: false, error: `Id de nó duplicado: "${n.id}".` };
    }
    nodeIds.add(n.id);
    const label = typeof n.label === "string" ? n.label : n.id;
    const pos = n.position;
    let x = 0;
    let y = 0;
    if (isRecord(pos)) {
      const nx = Number(pos.x);
      const ny = Number(pos.y);
      if (Number.isFinite(nx) && Number.isFinite(ny)) {
        x = nx;
        y = ny;
      } else {
        allNodesHavePosition = false;
      }
    } else {
      allNodesHavePosition = false;
    }
    nodes.push({
      id: n.id,
      type: "circular",
      position: { x, y },
      data: { label },
    });
  }

  if (nodes.length === 0) {
    return { ok: false, error: "O grafo precisa ter pelo menos um nó." };
  }

  const needsLayout = !allNodesHavePosition;

  const edges: Edge[] = [];
  const edgeIds = new Set<string>();

  for (let i = 0; i < data.edges.length; i++) {
    const e = data.edges[i];
    if (!isRecord(e)) {
      return { ok: false, error: `edges[${i}] inválido.` };
    }
    const source = typeof e.source === "string" ? e.source : "";
    const target = typeof e.target === "string" ? e.target : "";
    if (!nodeIds.has(source)) {
      return {
        ok: false,
        error: `edges[${i}]: nó origem "${source}" não existe em nodes.`,
      };
    }
    if (!nodeIds.has(target)) {
      return {
        ok: false,
        error: `edges[${i}]: nó destino "${target}" não existe em nodes.`,
      };
    }
    const w = Number(e.weight);
    if (!Number.isFinite(w)) {
      return { ok: false, error: `edges[${i}].weight deve ser um número.` };
    }
    const id =
      typeof e.id === "string" && e.id.trim() !== ""
        ? e.id
        : `imported-edge-${i}`;
    if (edgeIds.has(id)) {
      return {
        ok: false,
        error: `Id de aresta duplicado: "${id}".`,
      };
    }
    edgeIds.add(id);
    edges.push(makeEditorEdge(id, source, target, w, e.bidirectional === true));
  }

  if (needsLayout) {
    // Sem posições no arquivo: layout por forças (menos cruzamentos que o círculo antigo).
    const index = new Map(nodes.map((n, i) => [n.id, i]));
    const pos = forceLayout(nodes.length, edges.map((e) => [index.get(e.source)!, index.get(e.target)!]));
    const laidOut = applyPositions(nodes, pos);
    nodes.length = 0;
    nodes.push(...laidOut);
  }

  return { ok: true, nodes, edges };
}

/** Próximo sufixo numérico para ids `node-N` com base nos nós atuais. */
export function nextNodeCounterFromNodes(nodes: Node[]): number {
  let max = 0;
  for (const n of nodes) {
    const m = /^node-(\d+)$/.exec(n.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}
