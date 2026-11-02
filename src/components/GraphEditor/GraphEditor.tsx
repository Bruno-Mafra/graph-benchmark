import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlowProvider,
} from "reactflow";
import type { Connection, Edge as RFEdge, EdgeChange, Node, NodeChange, ReactFlowInstance } from "reactflow";
import "reactflow/dist/style.css";
import { toast } from "react-toastify";
import GraphNode from "./GraphNode";
import type { GraphNodeData } from "./GraphNode";
import GraphEdge from "./GraphEdge";
import type { GraphEdgeData } from "./GraphEdge";
import GraphCanvasView from "./GraphCanvasView";
import GhostNode from "../GhostNode/GhostNode";
import SimpleModal from "../SimpleModal/SimpleModal";
import { Field, Label, Input } from "../SimpleModal/styles";
import { edgeIsBidirectional, edgeWeight, makeEditorEdge, nodeLabel } from "../../graph/editorModel";
import { layoutEditorNodes, NODE_TYPE } from "../../graph/editorBuild";
import { LAYOUT_LABELS } from "../../graph/layout";
import type { LayoutKind } from "../../graph/layout";
import { GRAPH_VIEW_LIMITS, needsCanvasView } from "../../graph/config";
import { ActionButton, ModeButton, ToolGroupLabel, InfoBanner } from "../../pages/mazeStyles";
import { CheckboxRow } from "../../pages/styles";
import {
  EditorShell,
  EditorToolbar,
  ToolbarGroup,
  ToolbarSelect,
  Frame,
  ModeHint,
  LegendRow,
  ROLE_COLORS,
} from "./styles";

/** Caminho destacado: ids dos nós e arcos "origem>destino" do caminho. */
export type GraphHighlight = { nodes: Set<string>; arcs: Set<string>; color: string };

type EditorMode = "select" | "add" | "delete" | "source" | "target";

const MODES: { id: EditorMode; label: string; hint: string }[] = [
  { id: "select", label: "Mover", hint: "Arraste nós para mover; arraste a partir da borda de um nó até outro para criar uma aresta. Duplo clique edita." },
  { id: "add", label: "Adicionar nó", hint: "Clique no espaço vazio para adicionar nós. Esc volta ao modo Mover." },
  { id: "delete", label: "Remover", hint: "Clique em um nó (remove também as arestas dele) ou em uma aresta. Esc volta ao modo Mover." },
  { id: "source", label: "Definir origem", hint: "Clique no nó de origem." },
  { id: "target", label: "Definir destino", hint: "Clique no nó de destino." },
];

const nodeTypes = { [NODE_TYPE]: GraphNode };
const edgeTypes = { weighted: GraphEdge };

type Props = {
  nodes: Node[];
  edges: RFEdge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<RFEdge[]>>;
  /** Gera o id/rótulo do próximo nó criado no editor. */
  createNodeId: () => { id: string; label: string };
  sourceId: string | null;
  targetId: string | null;
  onSetSource: (id: string) => void;
  onSetTarget: (id: string | null) => void;
  highlight: GraphHighlight | null;
  /** Muda quando um grafo inteiro é carregado (modelo, importação): reajusta o zoom. */
  viewKey: number;
  onOpenPresets: () => void;
  onDownload: () => void;
  onClearAll: () => void;
};

/** Mesmo par de nós (sem ordem). */
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

function GraphEditorContent(props: Props) {
  const { nodes, edges, setNodes, setEdges, sourceId, targetId, highlight, viewKey } = props;
  const [mode, setMode] = useState<EditorMode>("select");
  const [undirectedNew, setUndirectedNew] = useState(false);
  const [layout, setLayout] = useState<LayoutKind>("auto");
  const [weightsPref, setWeightsPref] = useState<boolean | null>(null);
  const [rf, setRf] = useState<ReactFlowInstance | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [clearOpen, setClearOpen] = useState(false);
  const [edgeDraft, setEdgeDraft] = useState<{ id: string; weight: string; undirected: boolean } | null>(null);
  const [nodeDraft, setNodeDraft] = useState<{ id: string; label: string } | null>(null);

  const canvasMode = needsCanvasView(nodes.length, edges.length);
  const showWeights = weightsPref ?? edges.length <= GRAPH_VIEW_LIMITS.labelMaxEdges;

  useEffect(() => {
    const t = setTimeout(() => rf?.fitView({ padding: 0.15, duration: 200 }), 60);
    return () => clearTimeout(t);
  }, [viewKey, rf]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode("select");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (mode !== "add") return;
    let frame = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setMouse({ x: e.clientX, y: e.clientY }));
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [mode]);

  // Nós/arestas exibidos = modelo + papéis, destaque e curvatura (não volta ao modelo).
  const displayNodes = useMemo(
    () =>
      nodes.map((n) => {
        const isS = n.id === sourceId;
        const isT = n.id === targetId;
        const data: GraphNodeData = {
          label: nodeLabel(n),
          role: isS && isT ? "both" : isS ? "source" : isT ? "target" : null,
          pathColor: highlight?.nodes.has(n.id) ? highlight.color : null,
        };
        return { ...n, type: NODE_TYPE, data };
      }),
    [nodes, sourceId, targetId, highlight]
  );

  const displayEdges = useMemo(() => {
    const groups = new Map<string, number>();
    for (const e of edges) groups.set(pairKey(e.source, e.target), (groups.get(pairKey(e.source, e.target)) ?? 0) + 1);
    const seen = new Map<string, number>();
    const mapped = edges.map((e) => {
      const key = pairKey(e.source, e.target);
      const count = groups.get(key)!;
      const ordinal = seen.get(key) ?? 0;
      seen.set(key, ordinal + 1);
      // Orientação normalizada pelo par, para que arestas opostas não se sobreponham.
      const dir = e.source < e.target ? 1 : -1;
      const bidirectional = edgeIsBidirectional(e);
      const onPath =
        !!highlight &&
        (highlight.arcs.has(`${e.source}>${e.target}`) || (bidirectional && highlight.arcs.has(`${e.target}>${e.source}`)));
      const color = onPath ? highlight!.color : undefined;
      const data: GraphEdgeData = {
        weight: edgeWeight(e),
        bidirectional,
        offset: count > 1 ? (ordinal - (count - 1) / 2) * 22 * dir : 0,
        showLabel: showWeights,
        highlightColor: color ?? null,
      };
      return {
        ...e,
        type: "weighted",
        data,
        markerEnd: bidirectional ? undefined : { type: MarkerType.ArrowClosed, width: 16, height: 16, color: color ?? "#8b93a7" },
      };
    });
    // Arestas do caminho por último: ficam acima das outras arestas, mas na mesma
    // camada SVG — os rótulos de peso (camada própria, acima do SVG) continuam visíveis.
    return [...mapped.filter((e) => !e.data.highlightColor), ...mapped.filter((e) => e.data.highlightColor)];
  }, [edges, highlight, showWeights]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      const removed = new Set(changes.filter((c) => c.type === "remove").map((c) => (c as { id: string }).id));
      if (removed.size) setEdges((eds) => eds.filter((e) => !removed.has(e.source) && !removed.has(e.target)));
    },
    [setNodes, setEdges]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target) return;
      if (c.source === c.target) {
        toast.error("Laços (aresta de um nó para ele mesmo) não são suportados.");
        return;
      }
      const sameDir = edges.some((e) => e.source === c.source && e.target === c.target);
      const anyBetween = edges.filter((e) => pairKey(e.source, e.target) === pairKey(c.source!, c.target!));
      if (sameDir || anyBetween.some(edgeIsBidirectional) || (undirectedNew && anyBetween.length > 0)) {
        toast.error("Já existe uma aresta entre esses nós nesse sentido. Edite a existente (duplo clique).");
        return;
      }
      setEdges((eds) => [...eds, makeEditorEdge(`e-${Date.now().toString(36)}-${eds.length}`, c.source!, c.target!, 1, undirectedNew)]);
    },
    [edges, setEdges, undirectedNew]
  );

  const onPaneClick = (event: React.MouseEvent) => {
    if (mode !== "add" || !rf) return;
    const p = rf.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const { id, label } = props.createNodeId();
    setNodes((nds) => [...nds, { id, type: NODE_TYPE, data: { label }, position: { x: p.x - 22, y: p.y - 22 } }]);
  };

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    if (mode === "delete") {
      setNodes((nds) => nds.filter((n) => n.id !== node.id));
      setEdges((eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id));
    } else if (mode === "source") {
      props.onSetSource(node.id);
      setMode("select");
    } else if (mode === "target") {
      props.onSetTarget(node.id);
      setMode("select");
    }
  };

  const onEdgeClick = (_: React.MouseEvent, edge: RFEdge) => {
    if (mode === "delete") setEdges((eds) => eds.filter((e) => e.id !== edge.id));
  };

  const saveEdge = () => {
    if (!edgeDraft) return;
    const w = Number.parseFloat(edgeDraft.weight.replace(",", "."));
    if (!Number.isFinite(w)) {
      toast.warning("Informe um peso numérico (pode ser negativo ou zero).");
      return;
    }
    const edge = edges.find((e) => e.id === edgeDraft.id);
    if (!edge) return setEdgeDraft(null);
    if (edgeDraft.undirected && edges.some((e) => e.id !== edge.id && pairKey(e.source, e.target) === pairKey(edge.source, edge.target))) {
      toast.error("Há outra aresta entre esses nós; remova-a antes de tornar esta não direcionada.");
      return;
    }
    setEdges((eds) =>
      eds.map((e) => (e.id === edge.id ? { ...makeEditorEdge(e.id, e.source, e.target, w, edgeDraft.undirected), selected: e.selected } : e))
    );
    setEdgeDraft(null);
  };

  const reverseEdge = () => {
    if (!edgeDraft) return;
    const edge = edges.find((e) => e.id === edgeDraft.id);
    if (!edge) return;
    if (edges.some((e) => e.source === edge.target && e.target === edge.source)) {
      toast.error("Já existe a aresta no sentido oposto.");
      return;
    }
    setEdges((eds) => eds.map((e) => (e.id === edge.id ? makeEditorEdge(e.id, e.target, e.source, edgeWeight(e), false) : e)));
    setEdgeDraft(null);
  };

  const saveNode = () => {
    if (!nodeDraft) return;
    const label = nodeDraft.label.trim();
    if (!label) {
      toast.warning("O nome do nó não pode ficar vazio.");
      return;
    }
    setNodes((nds) => nds.map((n) => (n.id === nodeDraft.id ? { ...n, data: { ...n.data, label } } : n)));
    setNodeDraft(null);
  };

  const applyLayout = () => {
    setNodes((nds) => layoutEditorNodes(nds, edges, layout));
    setTimeout(() => rf?.fitView({ padding: 0.15, duration: 300 }), 60);
  };

  const modeInfo = MODES.find((m) => m.id === mode)!;
  const editingEdge = edgeDraft ? edges.find((e) => e.id === edgeDraft.id) : null;

  return (
    <EditorShell>
      <EditorToolbar>
        {!canvasMode && (
          <ToolbarGroup>
            <ToolGroupLabel>Modo</ToolGroupLabel>
            {MODES.map((m) => (
              <ModeButton
                key={m.id}
                type="button"
                $active={mode === m.id}
                aria-pressed={mode === m.id}
                $swatch={m.id === "source" ? ROLE_COLORS.source : m.id === "target" ? ROLE_COLORS.target : undefined}
                onClick={() => setMode(mode === m.id ? "select" : m.id)}
              >
                {m.label}
              </ModeButton>
            ))}
          </ToolbarGroup>
        )}
        {!canvasMode && (
          <ToolbarGroup>
            <ToolGroupLabel>Novas arestas</ToolGroupLabel>
            <ModeButton type="button" $active={!undirectedNew} onClick={() => setUndirectedNew(false)}>
              Direcionadas →
            </ModeButton>
            <ModeButton type="button" $active={undirectedNew} onClick={() => setUndirectedNew(true)}>
              Não direcionadas —
            </ModeButton>
          </ToolbarGroup>
        )}
        <ToolbarGroup>
          <ToolGroupLabel>Layout</ToolGroupLabel>
          <ToolbarSelect value={layout} onChange={(e) => setLayout(e.target.value as LayoutKind)} aria-label="Tipo de layout">
            {(Object.keys(LAYOUT_LABELS) as LayoutKind[]).map((k) => (
              <option key={k} value={k}>
                {LAYOUT_LABELS[k]}
              </option>
            ))}
          </ToolbarSelect>
          <ActionButton type="button" $variant="secondary" onClick={applyLayout} disabled={nodes.length === 0}>
            Reorganizar
          </ActionButton>
        </ToolbarGroup>
        <ToolbarGroup>
          {!canvasMode && (
            <CheckboxRow>
              <input type="checkbox" checked={showWeights} onChange={(e) => setWeightsPref(e.target.checked)} />
              <span>Pesos</span>
            </CheckboxRow>
          )}
          <ActionButton type="button" onClick={props.onOpenPresets}>
            Modelos prontos
          </ActionButton>
          <ActionButton type="button" $variant="secondary" onClick={props.onDownload} disabled={nodes.length === 0}>
            Baixar JSON
          </ActionButton>
          <ActionButton
            type="button"
            $variant="secondary"
            onClick={() => setClearOpen(true)}
            disabled={nodes.length === 0}
            style={{ color: "#fca5a5" }}
          >
            Apagar tudo
          </ActionButton>
        </ToolbarGroup>
      </EditorToolbar>

      {canvasMode && (
        <InfoBanner>
          <strong>
            Grafo grande ({nodes.length.toLocaleString("pt-BR")} vértices, {edges.length.toLocaleString("pt-BR")} arestas).
          </strong>{" "}
          Acima de {GRAPH_VIEW_LIMITS.editorMaxNodes} vértices ou {GRAPH_VIEW_LIMITS.editorMaxEdges} arestas o grafo é
          desenhado em Canvas (somente leitura) para manter a página fluida. Use a roda do mouse para zoom e arraste para
          navegar; origem/destino são escolhidos na seção de consulta. Os algoritmos rodam normalmente.
        </InfoBanner>
      )}

      <Frame $mode={canvasMode ? "select" : mode}>
        {canvasMode ? (
          <GraphCanvasView nodes={nodes} edges={edges} highlight={highlight} sourceId={sourceId} targetId={targetId} />
        ) : (
          <>
            <ModeHint>{nodes.length === 0 ? "Grafo vazio: use “Adicionar nó” ou “Modelos prontos”." : modeInfo.hint}</ModeHint>
            <GhostNode addingNode={mode === "add"} mousePos={mouse} />
            <ReactFlow
              nodes={displayNodes}
              edges={displayEdges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              connectionMode={ConnectionMode.Loose}
              connectionLineType={ConnectionLineType.Straight}
              connectionLineStyle={{ stroke: "#5b8cff", strokeWidth: 2 }}
              onPaneClick={onPaneClick}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onNodeDoubleClick={(_, n) => setNodeDraft({ id: n.id, label: nodeLabel(n) })}
              onEdgeDoubleClick={(_, e) =>
                setEdgeDraft({ id: e.id, weight: String(edgeWeight(e)), undirected: edgeIsBidirectional(e) })
              }
              onInit={setRf}
              deleteKeyCode={["Delete", "Backspace"]}
              nodesDraggable={mode === "select"}
              onlyRenderVisibleElements={nodes.length > 120}
              minZoom={0.05}
              maxZoom={3}
              fitView
            >
              <Background color="#2c2c34" gap={24} />
              <Controls showInteractive={false} />
              {nodes.length > 30 && (
                <MiniMap
                  pannable
                  zoomable
                  style={{ background: "#1c1c22" }}
                  maskColor="rgba(0, 0, 0, 0.55)"
                  nodeColor={(n) =>
                    n.id === sourceId ? ROLE_COLORS.source : n.id === targetId ? ROLE_COLORS.target : "#8b93a7"
                  }
                />
              )}
            </ReactFlow>
          </>
        )}
      </Frame>

      <LegendRow>
        <span>
          <span style={{ color: ROLE_COLORS.source }}>●</span> origem &nbsp; <span style={{ color: ROLE_COLORS.target }}>●</span>{" "}
          destino &nbsp; → aresta direcionada &nbsp; — aresta não direcionada (vale nos dois sentidos)
          {highlight && (
            <>
              {" "}
              &nbsp; <span style={{ color: highlight.color }}>━</span> caminho do resultado selecionado
            </>
          )}
        </span>
        {!canvasMode && <span>Delete/Backspace remove o que estiver selecionado.</span>}
      </LegendRow>

      <SimpleModal
        open={!!edgeDraft}
        title="Editar aresta"
        onClose={() => setEdgeDraft(null)}
        onConfirm={saveEdge}
      >
        <Field>
          <Label htmlFor="edge-weight">Peso (pode ser negativo, zero ou decimal)</Label>
          <Input
            id="edge-weight"
            type="number"
            step="any"
            value={edgeDraft?.weight ?? ""}
            onChange={(e) => setEdgeDraft((d) => d && { ...d, weight: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && saveEdge()}
            autoFocus
          />
        </Field>
        <Field>
          <CheckboxRow>
            <input
              type="checkbox"
              checked={edgeDraft?.undirected ?? false}
              onChange={(e) => setEdgeDraft((d) => d && { ...d, undirected: e.target.checked })}
            />
            <span>Não direcionada (mesmo peso nos dois sentidos)</span>
          </CheckboxRow>
        </Field>
        {editingEdge && !edgeIsBidirectional(editingEdge) && (
          <Field>
            <ActionButton type="button" $variant="secondary" onClick={reverseEdge}>
              Inverter sentido ({nodeLabelById(nodes, editingEdge.target)} → {nodeLabelById(nodes, editingEdge.source)})
            </ActionButton>
          </Field>
        )}
      </SimpleModal>

      <SimpleModal open={!!nodeDraft} title="Renomear nó" onClose={() => setNodeDraft(null)} onConfirm={saveNode}>
        <Field>
          <Label htmlFor="node-label">Nome</Label>
          <Input
            id="node-label"
            value={nodeDraft?.label ?? ""}
            onChange={(e) => setNodeDraft((d) => d && { ...d, label: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && saveNode()}
            autoFocus
          />
        </Field>
      </SimpleModal>

      <SimpleModal
        open={clearOpen}
        title="Apagar todo o grafo?"
        onClose={() => setClearOpen(false)}
        onConfirm={() => {
          setClearOpen(false);
          props.onClearAll();
        }}
        confirmLabel="Sim, apagar"
      >
        <p style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.5, color: "#c8c8c8" }}>
          Todos os nós e arestas serão removidos. Esta ação não pode ser desfeita (baixe o JSON antes, se quiser guardar).
        </p>
      </SimpleModal>
    </EditorShell>
  );
}

function nodeLabelById(nodes: Node[], id: string): string {
  const n = nodes.find((x) => x.id === id);
  return n ? nodeLabel(n) : id;
}

function GraphEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <GraphEditorContent {...props} />
    </ReactFlowProvider>
  );
}

export default GraphEditor;
