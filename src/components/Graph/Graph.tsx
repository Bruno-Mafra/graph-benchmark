import React, { useState, useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Controls,
  Background,
  MarkerType,
  ConnectionLineType,
  ReactFlowProvider,
  useStoreApi,
} from "reactflow";
import { toast } from "react-toastify";
import type {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import CustomNode from "../Node/Node";
import GhostNode from "../GhostNode/GhostNode";
import WeightedEdge from "../WeightedEdge/WeightedEdge";
import SimpleModal from "../SimpleModal/SimpleModal";
import {
  DeleteIcon,
  DownloadIcon,
  CircleAddIcon,
  ClearAllIcon,
} from "../../assets/icons/icons";
import { Wrapper, MenuContainer, MenuButton, FlowWrapper, Divider } from "./styles";

const nodeTypes = { circular: CustomNode };
const edgeTypes = { weighted: WeightedEdge };

const PanelModes = {
  ADD: "add",
  DELETE: "delete",
  DEFAULT: "default",
} as const;

type PanelModeType =
  typeof PanelModes[keyof typeof PanelModes];

export type GraphProps = {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  counterNodeId: number;
  setCounterNodeId: React.Dispatch<React.SetStateAction<number>>;
  onDownloadGraph?: () => void;
  onGraphCleared?: () => void;
};

function GraphContent({
  nodes,
  setNodes,
  edges,
  setEdges,
  counterNodeId,
  setCounterNodeId,
  onDownloadGraph,
  onGraphCleared,
}: GraphProps) {
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [panelMode, setPanelMode] = useState<PanelModeType>(PanelModes.DEFAULT);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);

  const edgesRef = useRef(edges);

  const store = useStoreApi();
  const pendingInvalidReasonRef = useRef<"self" | "duplicate" | null>(null);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Deletar nós e edges com Delete
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        setEdges((eds) => eds.filter((edge) => !edge.selected));
        setNodes((nds) => nds.filter((node) => !node.selected));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [panelMode]);

  // Segue o mouse enquanto estiver adicionando
  useEffect(() => {
    if (panelMode !== PanelModes.ADD) return;
  
    let animationFrameId: number;
  
    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        setMousePos({ x: e.clientX, y: e.clientY });
      });
    };
  
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [panelMode]);

  // Sem laço no próprio nó; no máximo uma aresta A→B (e uma B→A)
  const isValidConnection = useCallback((connection: Connection | null) => {
    if (!connection?.source || !connection?.target) return false;

    if (connection.source === connection.target) {
      pendingInvalidReasonRef.current = "self";
      return false;
    }

    const eds = edgesRef.current;
    const alreadyExists = eds.some(
      (e) => e.source === connection.source && e.target === connection.target
    );
    if (alreadyExists) {
      pendingInvalidReasonRef.current = "duplicate";
      return false;
    }

    pendingInvalidReasonRef.current = null;
    return true;
  }, []);

  const onConnectEnd = useCallback(() => {
    const { connectionStatus } = store.getState();
    if (connectionStatus !== "invalid") {
      pendingInvalidReasonRef.current = null;
      return;
    }
    const reason = pendingInvalidReasonRef.current;
    pendingInvalidReasonRef.current = null;
    if (reason === "self") {
      toast.error("Não é possível conectar um nó a ele mesmo.");
    } else if (reason === "duplicate") {
      toast.error(
        "Já existe uma aresta entre esses nós nesse sentido. Não é possível duplicar a conexão."
      );
    }
  }, [store]);

  // Atualiza nós
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );

  // Atualiza arestas
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  // Conecta dois nós (com peso inicial 1); trava duplicatas e laços (defensivo)
  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => {
      if (connection.source === connection.target) {
        toast.error("Não é possível conectar um nó a ele mesmo.");
        return eds;
      }
      const alreadyExists = eds.some(
        (e) => e.source === connection.source && e.target === connection.target
      );
      if (alreadyExists) {
        toast.error(
          "Já existe uma aresta entre esses nós nesse sentido. Não é possível duplicar a conexão."
        );
        return eds;
      }
      return addEdge(
        {
          ...connection,
          type: "weighted",
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed },
          data: { weight: 1 },
        },
        eds
      );
    });
  }, []);

  // Adiciona nó ao clicar
  const handleAddNode = (event: React.MouseEvent) => {
    if (!reactFlowInstance) return;

    const nodeSize = 100;
    const pos = reactFlowInstance?.screenToFlowPosition({
      x: event.clientX - nodeSize / 2,
      y: event.clientY - nodeSize / 2,
    });

    const newNode: Node = {
      id: `node-${counterNodeId}`,
      type: "circular",
      data: { label: `Nó ${counterNodeId}` },
      position: pos,
    };

    setNodes((nds) => [...nds, newNode]);
    setPanelMode(PanelModes.DEFAULT);
    setCounterNodeId(counterNodeId + 1);
  };

  // Callback chamado ao clicar no painel
  const onPaneClick = (event: React.MouseEvent) => {
    if (panelMode !== PanelModes.ADD) return;

    handleAddNode(event);
  };
  
  // Callback chamado ao clicar em um nó
  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    if (panelMode !== PanelModes.DELETE) return;

    setNodes((nds) => nds.filter((n) => n.id !== node.id));
    setPanelMode(PanelModes.DEFAULT);
  };

  // Callback chamado ao clicar em uma aresta
  const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    if (panelMode !== PanelModes.DELETE) return;
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    setPanelMode(PanelModes.DEFAULT);
  };

  // Define o modo atual
  const setCurrentMode = (mode: PanelModeType) => {
    if (panelMode === mode) {
      setPanelMode(PanelModes.DEFAULT);
    } else {
      setPanelMode(mode);
    }
  };

  const openClearAllModal = useCallback(() => {
    if (nodes.length === 0 && edges.length === 0) return;
    setClearAllModalOpen(true);
  }, [nodes.length, edges.length]);

  const confirmClearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setCounterNodeId(1);
    setPanelMode(PanelModes.DEFAULT);
    setClearAllModalOpen(false);
    onGraphCleared?.();
    toast.success("Grafo apagado.");
  }, [setNodes, setEdges, setCounterNodeId, onGraphCleared]);

  const cancelClearAll = useCallback(() => {
    setClearAllModalOpen(false);
  }, []);

  const canClear = nodes.length > 0 || edges.length > 0;

  return (
    <Wrapper>
      <GhostNode addingNode={panelMode === PanelModes.ADD} mousePos={mousePos} />
      <MenuContainer>
        <MenuButton 
          title="Adicionar Nó"
          isSelected={panelMode === PanelModes.ADD}
          onClick={() => setCurrentMode(PanelModes.ADD)}
        >
          <CircleAddIcon />
        </MenuButton>
        <MenuButton 
          title="Remover elemento"
          isSelected={panelMode === PanelModes.DELETE}
          onClick={() => setCurrentMode(PanelModes.DELETE)}
        >
          <DeleteIcon />
        </MenuButton>
        <Divider />
        <MenuButton
          title="Baixar grafo"
          type="button"
          onClick={() => onDownloadGraph?.()}
          disabled={!onDownloadGraph}
        >
          <DownloadIcon />
        </MenuButton>
        <MenuButton
          title="Apagar tudo"
          type="button"
          onClick={openClearAllModal}
          disabled={!canClear}
        >
          <ClearAllIcon color="#ef4444" />
        </MenuButton>
      </MenuContainer>
      <SimpleModal
        open={clearAllModalOpen}
        title="Apagar todo o grafo?"
        onClose={cancelClearAll}
        onConfirm={confirmClearAll}
        confirmLabel="Sim, apagar"
        cancelLabel="Cancelar"
      >
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 14,
            lineHeight: 1.5,
            color: "#c8c8c8",
          }}
        >
          Todos os <strong style={{ color: "#eee" }}>nós</strong> e{" "}
          <strong style={{ color: "#eee" }}>arestas</strong> serão removidos. Esta
          ação não pode ser desfeita.
        </p>
      </SimpleModal>
      <FlowWrapper $mode={panelMode}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectEnd={onConnectEnd}
          isValidConnection={isValidConnection}
          onPaneClick={onPaneClick}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onInit={setReactFlowInstance}
          fitView
          snapToGrid
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionLineType={ConnectionLineType.Step}
          defaultEdgeOptions={{
            type: "weighted",
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: { weight: 1 },
          }}
        >
          <Controls />
          <Background />
        </ReactFlow>
      </FlowWrapper>
    </Wrapper>
  );
}

function Graph(props: GraphProps) {
  return (
    <ReactFlowProvider>
      <GraphContent {...props} />
    </ReactFlowProvider>
  );
}

export default Graph;