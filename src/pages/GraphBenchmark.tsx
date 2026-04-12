import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import type { Node, Edge } from "reactflow";
import LogoDark from "../assets/logo-dark-2.png";
import Graph from "../components/Graph/Graph";
import {
  serializeGraphToJson,
  parseGraphFromJson,
  nextNodeCounterFromNodes,
  GRAPH_FILE_EXTENSION,
} from "../graph/graphFileFormat";
import { reactFlowToAdjacencyList } from "../graph/reactFlowToGraph";
import { graphHasNegativeEdge } from "../graph/graphAnalysis";
import { runBenchmark } from "../benchmark/runBenchmark";
import type { BenchmarkRunResult } from "../benchmark/runBenchmark";
import BenchmarkTimeChart from "../benchmark/BenchmarkTimeChart";
import BenchmarkMemoryChart from "../benchmark/BenchmarkMemoryChart";
import { chartColorForAlgorithm } from "../benchmark/chartColors";
import SimpleModal from "../components/SimpleModal/SimpleModal";
import PresetGraphModal from "../components/PresetGraphModal/PresetGraphModal";
import {
  MainContent,
  PageHeader,
  HeaderContent,
  PageContent,
  CreateGraphContainer,
  Divider,
  OptionsWrapper,
  OptionBox,
  HiddenRadio,
  CustomRadio,
  RadioLabel,
  UploadPanel,
  DropZone,
  DropZoneFileButton,
  DropHint,
  FormatInstructions,
  JsonExample,
  EditorToolbar,
  PresetModelButton,
  BenchmarkContainer,
  BenchmarkParagraph,
  AlgorithmCheckboxList,
  CheckboxRow,
  StartBenchmarkButton,
  ResultsRankList,
  ResultRankCard,
  ResultRankTopRow,
  ResultRankLeft,
  RankBadge,
  ResultRankLabel,
  ResultRankTime,
  PerfBarRow,
  PerfBarTrack,
  PerfBarFill,
  PerfBarCaption,
  SourceRow,
  SourceLabel,
  SourceSelect,
  WarningBanner,
  MetricsBlock,
  MetricsTitle,
  SkippedReason,
  DistancesTable,
  DistancesTableRow,
  DistancesShowMoreButton,
  ChartSection,
  SubSectionTitle,
} from "./styles";

const initialNodes: Node[] = [
  {
    id: "node-1",
    type: "circular",
    data: { label: "Nó 1" },
    position: { x: 100, y: 100 },
  },
];

const initialEdges: Edge[] = [];

const GRAPH_FORMAT_EXAMPLE = `{
  "version": 1,
  "nodes": [
    { "id": "node-1", "label": "A" },
    { "id": "node-2", "label": "B", "position": { "x": 300, "y": 200 } }
  ],
  "edges": [
    { "id": "e1", "source": "node-1", "target": "node-2", "weight": 2.5 }
  ]
}`;

function formatDist(d: number): string {
  if (d === Infinity || !Number.isFinite(d)) return "∞";
  if (Number.isInteger(d)) return String(d);
  const rounded = Math.round(d * 1e9) / 1e9;
  return String(rounded);
}

function nodeDisplayLabel(n: Node, index: number): string {
  const label = n.data && typeof (n.data as { label?: string }).label === "string"
    ? (n.data as { label: string }).label
    : n.id;
  return `${label} (índice ${index})`;
}

function GraphBenchmark() {
  /** `upload` = editor visual; `custom` = tela só de importação (sem canvas). */
  const [graphType, setGraphType] = useState<"upload" | "custom">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [counterNodeId, setCounterNodeId] = useState(2);

  const [sourceNodeIndex, setSourceNodeIndex] = useState(0);
  const [useDijkstra, setUseDijkstra] = useState(true);
  const [useBellmanFord, setUseBellmanFord] = useState(true);
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [lastRun, setLastRun] = useState<BenchmarkRunResult | null>(null);
  /** Linhas visíveis na tabela de distâncias (paginação +10). */
  const [distTableVisibleRows, setDistTableVisibleRows] = useState(10);

  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    nodes: Node[];
    edges: Edge[];
    fileName: string;
  } | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const dragCounterRef = useRef(0);

  const hasNegativeEdge = useMemo(() => {
    const c = reactFlowToAdjacencyList(nodes, edges);
    if (!c.ok) return false;
    return graphHasNegativeEdge(c.graph);
  }, [nodes, edges]);

  const referenceDistances = useMemo(() => {
    if (!lastRun) return null;
    const r = lastRun.results.find((x) => !x.skipped && x.dist);
    return r?.dist ?? null;
  }, [lastRun]);

  /** Algoritmos com tempo medido, do mais rápido ao mais lento. */
  const timeRanking = useMemo(() => {
    if (!lastRun) return null;
    const ok = lastRun.results.filter(
      (r) => !r.skipped && r.avgTimeUs != null && r.avgTimeMs != null
    );
    if (ok.length === 0) return null;
    const ordered = [...ok].sort((a, b) => a.avgTimeUs! - b.avgTimeUs!);
    const maxUs = Math.max(
      ...ordered.map((r) => r.avgTimeUs!),
      Number.EPSILON
    );
    return { ordered, maxUs };
  }, [lastRun]);

  useEffect(() => {
    if (sourceNodeIndex >= nodes.length) {
      setSourceNodeIndex(0);
    }
  }, [nodes.length, sourceNodeIndex]);

  useEffect(() => {
    setDistTableVisibleRows(10);
  }, [lastRun]);

  const handleDownloadGraph = useCallback(() => {
    const json = serializeGraphToJson(nodes, edges);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grafo${GRAPH_FILE_EXTENSION}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo do grafo baixado (mesmo formato do import).");
  }, [nodes, edges]);

  const readFileAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("read"));
      reader.readAsText(file, "UTF-8");
    });

  const tryPrepareImport = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".json")) {
      toast.warning("Formato inválido. Use apenas arquivos .json.");
      return;
    }
    try {
      const text = await readFileAsText(file);
      const parsed = parseGraphFromJson(text);
      if (!parsed.ok) {
        toast.error(parsed.error);
        return;
      }
      setPendingImport({
        nodes: parsed.nodes,
        edges: parsed.edges,
        fileName: file.name,
      });
      setImportModalOpen(true);
    } catch {
      toast.error("Não foi possível ler o arquivo.");
    }
  }, []);

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) void tryPrepareImport(file);
    },
    [tryPrepareImport]
  );

  const confirmGraphImport = useCallback(() => {
    if (!pendingImport) return;
    setNodes(pendingImport.nodes);
    setEdges(pendingImport.edges);
    setCounterNodeId(nextNodeCounterFromNodes(pendingImport.nodes));
    setSourceNodeIndex(0);
    setLastRun(null);
    setGraphType("upload");
    setImportModalOpen(false);
    setPendingImport(null);
    toast.success(
      "Grafo importado. Abra «Cria grafo personalizado» para ver e editar no editor."
    );
  }, [pendingImport, setNodes, setEdges, setCounterNodeId, setLastRun]);

  const cancelGraphImport = useCallback(() => {
    setImportModalOpen(false);
    setPendingImport(null);
  }, []);

  const onDropZoneDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    setDropActive(true);
  }, []);

  const onDropZoneDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDropActive(false);
    }
  }, []);

  const onDropZoneDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDropZoneDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setDropActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void tryPrepareImport(file);
    },
    [tryPrepareImport]
  );

  const anyAlgorithmSelected = useDijkstra || useBellmanFord;

  const handleStartBenchmark = useCallback(() => {
    if (!anyAlgorithmSelected) {
      toast.warning("Selecione pelo menos um algoritmo.");
      return;
    }

    const converted = reactFlowToAdjacencyList(nodes, edges);
    if (!converted.ok) {
      toast.error(converted.error);
      return;
    }

    if (sourceNodeIndex < 0 || sourceNodeIndex >= converted.nodeIds.length) {
      toast.error("Origem inválida.");
      return;
    }

    setBenchmarkRunning(true);
    setLastRun(null);

    queueMicrotask(() => {
      void (async () => {
        try {
          const run = await runBenchmark(converted.graph, sourceNodeIndex, {
            dijkstra: useDijkstra,
            bellmanFord: useBellmanFord,
          });
          setLastRun(run);
        } catch (e) {
          console.error(e);
          toast.error("Erro ao executar o benchmark.");
        } finally {
          setBenchmarkRunning(false);
        }
      })();
    });
  }, [
    nodes,
    edges,
    sourceNodeIndex,
    anyAlgorithmSelected,
    useDijkstra,
    useBellmanFord,
  ]);

  const handleGraphTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGraphType(e.target.value as "upload" | "custom");
  };

  return (
    <MainContent>
      <ToastContainer position="top-center" theme="light" />
      <PageHeader>
        <HeaderContent>
          <img src={LogoDark} className="logo" alt="Vite logo" />
          <h1>Graph Benchmark</h1>
        </HeaderContent>
      </PageHeader>
      <PageContent>
        <CreateGraphContainer>
          <p>
            Olá, seja bem-vindo ao Graph Benchmark! Comece criando seu grafo para
            depois analisar o desempenho de diferentes algoritmos de caminho mais
            curto.
          </p>
          <Divider />
          <h2>Crie seu grafo</h2>
          <OptionsWrapper>
            <OptionBox isSelected={graphType === "upload"}>
              <RadioLabel>
                <HiddenRadio
                  name="graphType"
                  value="upload"
                  checked={graphType === "upload"}
                  onChange={handleGraphTypeChange}
                />
                <CustomRadio />
                <p>Cria grafo personalizado</p>
              </RadioLabel>
              <p>Crie um grafo personalizado com nós e arestas</p>
            </OptionBox>
            <OptionBox isSelected={graphType === "custom"}>
              <RadioLabel>
                <HiddenRadio
                  name="graphType"
                  value="custom"
                  checked={graphType === "custom"}
                  onChange={handleGraphTypeChange}
                />
                <CustomRadio />
                <p>Fazer upload de um grafo</p>
              </RadioLabel>
              <p>Faça upload de um grafo a partir de um arquivo JSON</p>
            </OptionBox>
          </OptionsWrapper>

          {graphType === "upload" && (
            <>
              <EditorToolbar>
                <PresetModelButton
                  type="button"
                  onClick={() => setPresetModalOpen(true)}
                >
                  Escolher modelo pronto
                </PresetModelButton>
              </EditorToolbar>
              <BenchmarkParagraph>
                Use os botões à esquerda do canvas para adicionar ou remover nós e
                arestas. Duplo clique no nó ou na aresta para editar nome ou peso.
              </BenchmarkParagraph>
              <Graph
                nodes={nodes}
                setNodes={setNodes}
                edges={edges}
                setEdges={setEdges}
                counterNodeId={counterNodeId}
                setCounterNodeId={setCounterNodeId}
                onDownloadGraph={handleDownloadGraph}
                onGraphCleared={() => setLastRun(null)}
              />
              <PresetGraphModal
                open={presetModalOpen}
                onClose={() => setPresetModalOpen(false)}
                onApply={(newNodes, newEdges) => {
                  setNodes(newNodes);
                  setEdges(newEdges);
                  setCounterNodeId(nextNodeCounterFromNodes(newNodes));
                  setSourceNodeIndex(0);
                  setLastRun(null);
                  toast.success("Grafo gerado a partir do modelo.");
                }}
              />
            </>
          )}

          {graphType === "custom" && (
            <UploadPanel>
              <FormatInstructions>
                <p style={{ margin: 0 }}>
                  Envie um arquivo <code>JSON</code> codificado em UTF-8 (extensão
                  sugerida <code>{GRAPH_FILE_EXTENSION}</code>) com esta estrutura:
                </p>
                <ul>
                  <li>
                    <code>version</code>: sempre <code>1</code>
                  </li>
                  <li>
                    <code>nodes</code>: lista de nós com <code>id</code> e{" "}
                    <code>label</code>; <code>position: {"{ x, y }"}</code> (px no
                    editor) é opcional — se faltar em algum nó, as posições são
                    calculadas automaticamente na importação
                  </li>
                  <li>
                    <code>edges</code>: lista com <code>source</code> e{" "}
                    <code>target</code> iguais aos <code>id</code> dos nós, e{" "}
                    <code>weight</code> (número; pode ser negativo)
                  </li>
                  <li>
                    <code>id</code> em cada aresta é opcional na importação (é gerado
                    se faltar)
                  </li>
                  <li>
                    <code>bidirectional</code> (opcional): se <code>true</code>, o mesmo
                    peso vale nos dois sentidos entre <code>source</code> e{" "}
                    <code>target</code> (uma aresta visual no editor)
                  </li>
                </ul>
                <p style={{ margin: "12px 0 0" }}>
                  O arquivo exportado pelo botão &quot;Baixar grafo&quot; segue
                  exatamente este formato e pode ser reimportado aqui.
                </p>
              </FormatInstructions>
              <JsonExample>{GRAPH_FORMAT_EXAMPLE}</JsonExample>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: "none" }}
                onChange={onFileInputChange}
              />
              <DropZone
                $active={dropActive}
                onDragEnter={onDropZoneDragEnter}
                onDragLeave={onDropZoneDragLeave}
                onDragOver={onDropZoneDragOver}
                onDrop={onDropZoneDrop}
              >
                <DropZoneFileButton
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Selecionar arquivo
                </DropZoneFileButton>
                <DropHint>
                  ou arraste e solte o arquivo aqui.
                  <br />
                  Formatos válidos: .json
                </DropHint>
              </DropZone>
            </UploadPanel>
          )}

          <SimpleModal
            open={importModalOpen}
            title="Importar este grafo?"
            onClose={cancelGraphImport}
            onConfirm={confirmGraphImport}
            confirmLabel="Sim, substituir"
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
              O arquivo <strong style={{ color: "#eee" }}>{pendingImport?.fileName}</strong>{" "}
              vai substituir o grafo atual que aparece na aba{" "}
              <strong style={{ color: "#eee" }}>Cria grafo personalizado</strong>.
              Deseja continuar?
            </p>
          </SimpleModal>
        </CreateGraphContainer>
        <BenchmarkContainer>
          <h2>Benchmark</h2>
          <BenchmarkParagraph>
            O tempo médio por execução é estimado repetindo o algoritmo até o
            bloco levar pelo menos ~2 ms (assim grafos pequenos deixam de aparecer
            como 0 ms). Valores também são mostrados em microssegundos (µs).
          </BenchmarkParagraph>

          <SourceRow>
            <SourceLabel htmlFor="benchmark-source">Nó de origem (fonte)</SourceLabel>
            <SourceSelect
              id="benchmark-source"
              value={Math.min(sourceNodeIndex, Math.max(0, nodes.length - 1))}
              onChange={(e) => setSourceNodeIndex(Number(e.target.value))}
            >
              {nodes.map((n, i) => (
                <option key={n.id} value={i}>
                  {nodeDisplayLabel(n, i)}
                </option>
              ))}
            </SourceSelect>
          </SourceRow>

          {hasNegativeEdge && (
            <WarningBanner>
              <strong>Peso negativo detectado.</strong> O Dijkstra exige pesos não
              negativos; essa execução não roda o Dijkstra. Use Bellman-Ford para
              grafos com pesos negativos (e verificação de ciclo negativo).
            </WarningBanner>
          )}

          <AlgorithmCheckboxList>
            <CheckboxRow>
              <input
                type="checkbox"
                id="algo-dijkstra"
                checked={useDijkstra}
                onChange={(e) => setUseDijkstra(e.target.checked)}
              />
              <span>Dijkstra</span>
            </CheckboxRow>
            <CheckboxRow>
              <input
                type="checkbox"
                id="algo-bellman-ford"
                checked={useBellmanFord}
                onChange={(e) => setUseBellmanFord(e.target.checked)}
              />
              <span>Bellman-Ford</span>
            </CheckboxRow>
          </AlgorithmCheckboxList>
          <StartBenchmarkButton
            type="button"
            onClick={handleStartBenchmark}
            disabled={benchmarkRunning || !anyAlgorithmSelected}
          >
            {benchmarkRunning ? "Executando…" : "Iniciar benchmark"}
          </StartBenchmarkButton>

          {lastRun && lastRun.results.length > 0 && (
            <>
              <SubSectionTitle>Comparação de tempo (média por execução)</SubSectionTitle>
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: 12,
                  color: "#9a9a9a",
                  lineHeight: 1.45,
                }}
              >
                Ordenado do <strong style={{ color: "#ddd" }}>melhor</strong> (menor
                tempo médio) para o pior. A barra colorida é proporcional ao tempo em
                relação ao algoritmo mais lento desta rodada (100% = mais lento).
              </p>
              {timeRanking && (
                <ResultsRankList>
                  {timeRanking.ordered.map((r, idx) => {
                    const rank = idx + 1;
                    const pct = (r.avgTimeUs! / timeRanking.maxUs) * 100;
                    const color = chartColorForAlgorithm(r.algorithmId, idx);
                    return (
                      <ResultRankCard key={r.algorithmId} $rank={rank}>
                        <ResultRankTopRow>
                          <ResultRankLeft>
                            <RankBadge $rank={rank}>
                              {rank}º
                              {rank === 1 ? " melhor" : ""}
                            </RankBadge>
                            <ResultRankLabel>{r.label}</ResultRankLabel>
                          </ResultRankLeft>
                          <ResultRankTime
                            title={`${r.batchRuns?.toLocaleString()} repetições no bloco medido`}
                          >
                            {r.avgTimeUs!.toFixed(3)} µs
                            <span style={{ opacity: 0.75, marginLeft: 8 }}>
                              ({r.avgTimeMs!.toFixed(6)} ms)
                            </span>
                          </ResultRankTime>
                        </ResultRankTopRow>
                        <PerfBarRow>
                          <PerfBarTrack>
                            <PerfBarFill $widthPct={pct} $color={color} />
                          </PerfBarTrack>
                          <PerfBarCaption>
                            {pct.toFixed(0)}% do tempo do pior nesta comparação
                          </PerfBarCaption>
                        </PerfBarRow>
                      </ResultRankCard>
                    );
                  })}
                </ResultsRankList>
              )}

              <ChartSection>
                <BenchmarkTimeChart results={lastRun.results} />
              </ChartSection>

              {lastRun.results.some((r) => !r.skipped) && (
                <ChartSection>
                  <BenchmarkMemoryChart results={lastRun.results} />
                </ChartSection>
              )}

              {lastRun.results.some((r) => r.skipped) && (
                <>
                  <SubSectionTitle>Algoritmo não executado</SubSectionTitle>
                  {lastRun.results
                    .filter((r) => r.skipped)
                    .map((r) => (
                      <SkippedReason key={r.algorithmId}>
                        <strong>{r.label}:</strong> {r.skipReason}
                      </SkippedReason>
                    ))}
                </>
              )}

              <SubSectionTitle>Métricas adicionais</SubSectionTitle>
              {lastRun.heapBeforeRunBytes != null && (
                <p
                  style={{
                    margin: "0 0 12px",
                    fontSize: 13,
                    color: "#b8b8b8",
                    lineHeight: 1.5,
                  }}
                >
                  Memória antes de medir os algoritmos:{" "}
                  <strong style={{ color: "#eee" }}>
                    {(lastRun.heapBeforeRunBytes / (1024 * 1024)).toFixed(2)} MB
                  </strong>
                  {lastRun.memoryMeasurementMode === "measureUA" ? (
                    <>
                      {" "}
                      (<code style={{ fontSize: 12 }}>
                        measureUserAgentSpecificMemory
                      </code>
                      — estimativa do user agent; requer Chrome recente e contexto
                      seguro, ex. <code style={{ fontSize: 12 }}>https</code> ou{" "}
                      <code style={{ fontSize: 12 }}>localhost</code>).
                    </>
                  ) : (
                    <>
                      {" "}
                      heap JS reportado (
                      <code style={{ fontSize: 12 }}>performance.memory</code>
                      , principalmente Chrome).
                    </>
                  )}
                </p>
              )}
              {lastRun.heapBeforeRunBytes == null &&
                lastRun.results.some((r) => !r.skipped) && (
                  <p
                    style={{
                      margin: "0 0 12px",
                      fontSize: 12,
                      color: "#a08060",
                      lineHeight: 1.45,
                    }}
                  >
                    Memória não pôde ser medida (API indisponível ou bloqueada). Use
                    Chrome em HTTPS ou localhost; em benchmarks controlados pode-se
                    iniciar o Chrome com{" "}
                    <code style={{ fontSize: 11 }}>
                      --js-flags=&quot;--expose-gc&quot;
                    </code>{" "}
                    para expor <code style={{ fontSize: 11 }}>gc()</code> e estabilizar
                    leituras.
                  </p>
                )}
              {lastRun.results.map((r) => {
                if (r.skipped) return null;
                return (
                  <MetricsBlock key={`m-${r.algorithmId}`}>
                    <MetricsTitle>{r.label}</MetricsTitle>
                    {r.heapUsedAfterBytes != null && (
                      <>
                        <div>
                          {r.memoryMeasurementMode === "measureUA"
                            ? "Memória (UA) após execução instrumentada"
                            : "Heap JS após execução instrumentada"}
                          :{" "}
                          <strong>
                            {(r.heapUsedAfterBytes / (1024 * 1024)).toFixed(2)} MB
                          </strong>
                          {r.memoryMeasurementMode !== "measureUA" && " usados"}
                          {r.jsHeapSizeLimit != null && r.jsHeapSizeLimit > 0 && (
                            <>
                              {" "}
                              (
                              {(
                                (r.heapUsedAfterBytes / r.jsHeapSizeLimit) *
                                100
                              ).toFixed(1)}
                              % do limite do contexto JS)
                            </>
                          )}
                        </div>
                        {r.totalJSHeapSize != null && (
                          <div style={{ opacity: 0.95 }}>
                            Total alocado no heap:{" "}
                            {(r.totalJSHeapSize / (1024 * 1024)).toFixed(2)} MB
                          </div>
                        )}
                        {r.heapDeltaBytes != null && (
                          <div>
                            Δ memória desde a medição anterior:{" "}
                            <strong
                              style={{
                                color:
                                  r.heapDeltaBytes > 0
                                    ? "#f0a878"
                                    : r.heapDeltaBytes < 0
                                      ? "#7dd3a8"
                                      : "#ddd",
                              }}
                            >
                              {r.heapDeltaBytes >= 0 ? "+" : ""}
                              {(r.heapDeltaBytes / 1024).toFixed(1)} KB
                            </strong>
                            <span style={{ opacity: 0.85 }}>
                              {" "}
                              (estimativa; GC pode alterar o valor)
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    {r.heapUsedAfterBytes == null && (
                      <div style={{ opacity: 0.8 }}>
                        Memória: use Chrome (HTTPS ou localhost) para{" "}
                        <code style={{ fontSize: 12 }}>measureUserAgentSpecificMemory</code>{" "}
                        ou <code style={{ fontSize: 12 }}>performance.memory</code>.
                      </div>
                    )}
                    {r.dijkstraMetrics && (
                      <>
                        <div>
                          Relaxamentos (melhoria de distância):{" "}
                          {r.dijkstraMetrics.relaxations.toLocaleString()}
                        </div>
                        <div>
                          Inserções na heap:{" "}
                          {r.dijkstraMetrics.heapPushes.toLocaleString()}
                        </div>
                        <div>
                          Tamanho máximo da heap: {r.dijkstraMetrics.maxHeapSize}
                        </div>
                        <div>
                          Tamanho médio da heap (amostrado):{" "}
                          {r.dijkstraMetrics.avgHeapSize.toFixed(2)}
                        </div>
                        <div>
                          Extrações da heap (iterações do laço principal):{" "}
                          {r.dijkstraMetrics.heapExtractions.toLocaleString()}
                        </div>
                      </>
                    )}
                    {r.bellmanMetrics && (
                      <>
                        <div>
                          Relaxamentos bem-sucedidos (1ª fase):{" "}
                          {r.bellmanMetrics.successfulRelaxations.toLocaleString()}
                        </div>
                        <div>
                          Iterações externas (passadas sobre V−1):{" "}
                          {r.bellmanMetrics.outerIterations}
                        </div>
                        <div>
                          Parada antecipada (sem atualização):{" "}
                          {r.bellmanMetrics.earlyStopped ? "sim" : "não"}
                        </div>
                        {r.hasNegativeCycle != null && (
                          <div>
                            Ciclo negativo detectado:{" "}
                            {r.hasNegativeCycle ? "sim" : "não"}
                          </div>
                        )}
                      </>
                    )}
                  </MetricsBlock>
                );
              })}

              {referenceDistances && (
                <>
                  <SubSectionTitle>Distâncias</SubSectionTitle>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#9a9a9a",
                      margin: "0 0 10px",
                      lineHeight: 1.45,
                    }}
                  >
                    Distância mínima até cada vértice a partir do nó de origem escolhido
                    acima.
                  </p>
                  <DistancesTable>
                    <thead>
                      <tr>
                        <th>Nó</th>
                        <th>Distância</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nodes
                        .slice(0, distTableVisibleRows)
                        .map((n, i) => {
                          const isSource = i === sourceNodeIndex;
                          return (
                            <DistancesTableRow key={n.id} $isSource={isSource}>
                              <td>
                                {nodeDisplayLabel(n, i)}
                                {isSource && (
                                  <span
                                    style={{
                                      marginLeft: 8,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: "#4ade80",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    origem
                                  </span>
                                )}
                              </td>
                              <td>{formatDist(referenceDistances[i]!)}</td>
                            </DistancesTableRow>
                          );
                        })}
                    </tbody>
                  </DistancesTable>
                  {nodes.length > distTableVisibleRows && (
                    <DistancesShowMoreButton
                      type="button"
                      onClick={() =>
                        setDistTableVisibleRows((c) =>
                          Math.min(c + 10, nodes.length)
                        )
                      }
                    >
                      Mostrar mais 10 ({nodes.length - distTableVisibleRows}{" "}
                      restantes)
                    </DistancesShowMoreButton>
                  )}
                </>
              )}
            </>
          )}
        </BenchmarkContainer>
      </PageContent>
    </MainContent>
  );
}

export default GraphBenchmark;
