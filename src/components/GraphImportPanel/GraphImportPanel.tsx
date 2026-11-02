import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import type { Node, Edge } from "reactflow";
import { AddFileIcon } from "../../assets/icons/icons";
import SimpleModal from "../SimpleModal/SimpleModal";
import { GRAPH_FILE_EXTENSION, parseGraphFromJson } from "../../graph/graphFileFormat";
import {
  UploadPanel,
  DropZone,
  DropZoneIcon,
  DropZoneFileButton,
  DropHint,
  DropHintDescription,
  FormatInstructions,
  JsonExample,
  SubSectionTitle,
} from "../../pages/styles";

const GRAPH_FORMAT_EXAMPLE = `{
  "version": 1,
  "nodes": [
    { "id": "node-1", "label": "A" },
    { "id": "node-2", "label": "B", "position": { "x": 300, "y": 200 } }
  ],
  "edges": [
    { "id": "e1", "source": "node-1", "target": "node-2", "weight": 2.5 },
    { "source": "node-2", "target": "node-1", "weight": -1 }
  ]
}`;

type Props = {
  onImport: (nodes: Node[], edges: Edge[], fileName: string) => void;
};

/** Importação de grafo por arquivo JSON (arrastar e soltar ou seletor). */
function GraphImportPanel({ onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [dropActive, setDropActive] = useState(false);
  const [pending, setPending] = useState<{ nodes: Node[]; edges: Edge[]; fileName: string } | null>(null);

  const prepare = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".json")) {
      toast.warning("Formato inválido. Use apenas arquivos .json.");
      return;
    }
    try {
      const parsed = parseGraphFromJson(await file.text());
      if (!parsed.ok) {
        toast.error(parsed.error);
        return;
      }
      setPending({ nodes: parsed.nodes, edges: parsed.edges, fileName: file.name });
    } catch {
      toast.error("Não foi possível ler o arquivo.");
    }
  };

  const stop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <UploadPanel>
      <SubSectionTitle $margin="0 0 -8px">Importar grafo</SubSectionTitle>
      <DropZone
        $active={dropActive}
        onDragEnter={(e) => {
          stop(e);
          dragCounter.current++;
          setDropActive(true);
        }}
        onDragLeave={(e) => {
          stop(e);
          if (--dragCounter.current <= 0) {
            dragCounter.current = 0;
            setDropActive(false);
          }
        }}
        onDragOver={(e) => {
          stop(e);
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          stop(e);
          dragCounter.current = 0;
          setDropActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void prepare(file);
        }}
      >
        <DropZoneIcon>
          <AddFileIcon />
        </DropZoneIcon>
        <DropZoneFileButton type="button" onClick={() => fileInputRef.current?.click()}>
          + Selecionar arquivo
        </DropZoneFileButton>
        <DropHint>ou arraste e solte o arquivo aqui</DropHint>
        <DropHintDescription>Formatos válidos: .json</DropHintDescription>
      </DropZone>
      <SubSectionTitle $margin="0 0 -8px">Formato</SubSectionTitle>
      <FormatInstructions>
        <p style={{ margin: 0 }}>
          Arquivo <code>JSON</code> em UTF-8 (extensão sugerida <code>{GRAPH_FILE_EXTENSION}</code>):
        </p>
        <ul>
          <li>
            <code>version</code>: sempre <code>1</code>
          </li>
          <li>
            <code>nodes</code>: <code>id</code> e <code>label</code>; <code>position: {"{ x, y }"}</code> é opcional — se
            faltar em algum nó, o layout é calculado automaticamente
          </li>
          <li>
            <code>edges</code>: <code>source</code> e <code>target</code> (ids dos nós) e <code>weight</code> (qualquer
            número, inclusive negativo ou zero); <code>id</code> é opcional
          </li>
          <li>
            <code>bidirectional: true</code> (opcional): aresta não direcionada, mesmo peso nos dois sentidos
          </li>
        </ul>
        <p style={{ margin: "12px 0 0" }}>O botão “Baixar JSON” do editor gera exatamente este formato.</p>
      </FormatInstructions>
      <SubSectionTitle $margin="0 0 -8px">Exemplo</SubSectionTitle>
      <JsonExample>{GRAPH_FORMAT_EXAMPLE}</JsonExample>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void prepare(file);
        }}
      />
      <SimpleModal
        open={!!pending}
        title="Importar este grafo?"
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending) onImport(pending.nodes, pending.edges, pending.fileName);
          setPending(null);
        }}
        confirmLabel="Sim, substituir"
      >
        <p style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.5, color: "#c8c8c8" }}>
          <strong style={{ color: "#eee" }}>{pending?.fileName}</strong> ({pending?.nodes.length} nós,{" "}
          {pending?.edges.length} arestas) vai substituir o grafo atual do editor.
        </p>
      </SimpleModal>
    </UploadPanel>
  );
}

export default GraphImportPanel;
