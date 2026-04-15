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
import BenchmarkGrowthChart from "../benchmark/BenchmarkGrowthChart";
import { runSparseGrowthCurve } from "../benchmark/growthBenchmark";
import type { GrowthCurveResult } from "../benchmark/growthBenchmark";
import { chartColorForAlgorithm } from "../benchmark/chartColors";
import SimpleModal from "../components/SimpleModal/SimpleModal";
import PresetGraphModal from "../components/PresetGraphModal/PresetGraphModal";
import { AddFileIcon } from "../assets/icons/icons";
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
  DropZoneIcon,
  DropZoneFileButton,
  DropHint,
  DropHintDescription,
  FormatInstructions,
  JsonExample,
  EditorToolbar,
  PresetModelButton,
  SectionContainer,
  EmptySectionContainer,
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
  SkippedReason,
  DistancesTableContainer,
  DistancesTable,
  DistancesTableRow,
  DistancesShowMoreButton,
  ChartSection,
  TitleContainer,
  SubSectionTitle,
  MetricsAlgoGrid,
  MetricsAlgoCard,
  MetricsAlgoTitle,
  MetricsAlgoHint,
  MetricsStatGrid,
  MetricsStat,
  MetricsStatLabel,
  MetricsStatValueRow,
  MetricsStatNumber,
  MetricsStatUnit,
  GrowthCurveButton,
  ResultsTitle,
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
  const [growthRun, setGrowthRun] = useState<GrowthCurveResult | null>(null);
  const [growthRunning, setGrowthRunning] = useState(false);
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
      try {
        const run = runBenchmark(converted.graph, sourceNodeIndex, {
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
    });
  }, [
    nodes,
    edges,
    sourceNodeIndex,
    anyAlgorithmSelected,
    useDijkstra,
    useBellmanFord,
  ]);

  const handleGrowthCurve = useCallback(() => {
    if (!anyAlgorithmSelected) {
      toast.warning("Selecione pelo menos um algoritmo.");
      return;
    }
    setGrowthRunning(true);
    setGrowthRun(null);
    void (async () => {
      try {
        const res = await runSparseGrowthCurve({
          dijkstra: useDijkstra,
          bellmanFord: useBellmanFord,
        });
        setGrowthRun(res);
        toast.success("Curva de crescimento concluída.");
      } catch (e) {
        console.error(e);
        toast.error("Erro ao calcular a curva de crescimento.");
      } finally {
        setGrowthRunning(false);
      }
    })();
  }, [anyAlgorithmSelected, useDijkstra, useBellmanFord]);

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
              <BenchmarkParagraph>
                Use os botões à esquerda do canvas para adicionar ou remover nós e
                arestas. Dê duplo clique no nó ou na aresta para editar nome ou peso.
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
              <EditorToolbar>
                <PresetModelButton
                  type="button"
                  onClick={() => setPresetModalOpen(true)}
                >
                  Escolher modelo pronto
                </PresetModelButton>
              </EditorToolbar>
            </>
          )}

          {graphType === "custom" && (
            <UploadPanel>
              <SubSectionTitle $margin="0 0 -8px">Importar grafo</SubSectionTitle>
              <DropZone
                $active={dropActive}
                onDragEnter={onDropZoneDragEnter}
                onDragLeave={onDropZoneDragLeave}
                onDragOver={onDropZoneDragOver}
                onDrop={onDropZoneDrop}
              >
                <DropZoneIcon>
                  <AddFileIcon />
                </DropZoneIcon>
                <DropZoneFileButton
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  + Selecionar arquivo
                </DropZoneFileButton>
                <DropHint>
                  ou arraste e solte o arquivo aqui
                </DropHint>
                <DropHintDescription>
                  Formatos válidos: .json
                </DropHintDescription>
              </DropZone>
              <SubSectionTitle $margin="0 0 -8px">Instruções de upload</SubSectionTitle>
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
              <SubSectionTitle $margin="0 0 -8px">Exemplo de arquivo JSON</SubSectionTitle>
              <JsonExample>{GRAPH_FORMAT_EXAMPLE}</JsonExample>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: "none" }}
                onChange={onFileInputChange}
              />
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
        <SectionContainer>
          <h2>Benchmark</h2>
          <BenchmarkParagraph>
            O tempo médio por execução é estimado repetindo o algoritmo até o
            bloco levar pelo menos ~2 ms (para garantir que funcione também para grafos pequenos). Valores também são mostrados em microssegundos (µs).
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
            <Divider />
            <ResultsTitle $margin="0 0 -16px">Resultados</ResultsTitle>
              <TitleContainer>
                <SubSectionTitle>Comparação de tempo (média por execução)</SubSectionTitle>
                <p
                  style={{
                    margin: "0px",
                    fontSize: 12,
                    color: "#9a9a9a",
                    lineHeight: 1.45,
                  }}
                >
                  Ordenado do <strong style={{ color: "#ddd" }}>melhor</strong> (menor
                  tempo médio) para o pior. A barra colorida é proporcional ao tempo em
                  relação ao algoritmo mais lento desta rodada (100% = mais lento).
                </p>
              </TitleContainer>
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

              <TitleContainer>
              <SubSectionTitle>Métricas adicionais</SubSectionTitle>
                <p
                  style={{
                    margin: "0px",
                    fontSize: 12,
                    color: "#9a9a9a",
                    lineHeight: 1.45,
                  }}
                >
                  Valores da última execução neste grafo.{" "}
                  <strong style={{ color: "#b8b8c0", fontWeight: 600 }}>
                    Dijkstra
                  </strong>{" "}
                  mede trabalho na{" "}
                  <span title="Fila onde o próximo nó processado é sempre o de menor distância provisória até agora">
                    fila de prioridade (heap)
                  </span>
                  ;{" "}
                  <strong style={{ color: "#b8b8c0", fontWeight: 600 }}>
                    Bellman-Ford
                  </strong>{" "}
                  mede passagens pelas arestas e se ainda dava para encurtar algum
                  caminho. Números grandes usam separador de milhares.
                </p>
              </TitleContainer>
              <MetricsAlgoGrid>
                {lastRun.results.map((r) => {
                  if (r.skipped) return null;
                  const accent = chartColorForAlgorithm(r.algorithmId, 0);
                  return (
                    <MetricsAlgoCard key={`m-${r.algorithmId}`} $accent={accent}>
                      <MetricsAlgoTitle>{r.label}</MetricsAlgoTitle>
                      {r.dijkstraMetrics && (
                        <>
                          <MetricsAlgoHint>
                            A fila guarda nós por distância provisória: quem está
                            no topo é o próximo a ser fixado. As contagens mostram
                            quanto ela foi usada.
                          </MetricsAlgoHint>
                          <MetricsStatGrid>
                            <MetricsStat
                              title="Cada vez que uma aresta melhora a estimativa de distância até um vizinho (relaxação)."
                            >
                              <MetricsStatLabel>Encurtamentos de caminho</MetricsStatLabel>
                              <MetricsStatValueRow>
                                <MetricsStatNumber>
                                  {r.dijkstraMetrics.relaxations.toLocaleString("pt-BR")}
                                </MetricsStatNumber>
                                <MetricsStatUnit>relaxações</MetricsStatUnit>
                              </MetricsStatValueRow>
                            </MetricsStat>
                            <MetricsStat
                              title="Quantas vezes um par (distância, nó) entrou na fila de prioridade."
                            >
                              <MetricsStatLabel>Entradas na fila</MetricsStatLabel>
                              <MetricsStatValueRow>
                                <MetricsStatNumber>
                                  {r.dijkstraMetrics.heapPushes.toLocaleString("pt-BR")}
                                </MetricsStatNumber>
                                <MetricsStatUnit>inserções na heap</MetricsStatUnit>
                              </MetricsStatValueRow>
                            </MetricsStat>
                            <MetricsStat
                              title="Quantos nós foram removidos da fila para serem processados (cada um era o de menor distância no momento)."
                            >
                              <MetricsStatLabel>Saídas da fila</MetricsStatLabel>
                              <MetricsStatValueRow>
                                <MetricsStatNumber>
                                  {r.dijkstraMetrics.heapExtractions.toLocaleString(
                                    "pt-BR"
                                  )}
                                </MetricsStatNumber>
                                <MetricsStatUnit>extrações (nós processados)</MetricsStatUnit>
                              </MetricsStatValueRow>
                            </MetricsStat>
                            <MetricsStat
                              title="Maior número de itens na heap ao mesmo tempo durante a execução."
                            >
                              <MetricsStatLabel>Pico da fila</MetricsStatLabel>
                              <MetricsStatValueRow>
                                <MetricsStatNumber>
                                  {r.dijkstraMetrics.maxHeapSize.toLocaleString("pt-BR")}
                                </MetricsStatNumber>
                                <MetricsStatUnit>nós de uma vez</MetricsStatUnit>
                              </MetricsStatValueRow>
                            </MetricsStat>
                            <MetricsStat
                              style={{ gridColumn: "1 / -1" }}
                              title="Média do tamanho da heap registrada após cada inserção (amostragem interna)."
                            >
                              <MetricsStatLabel>Tamanho médio da fila</MetricsStatLabel>
                              <MetricsStatValueRow>
                                <MetricsStatNumber>
                                  {r.dijkstraMetrics.avgHeapSize.toLocaleString("pt-BR", {
                                    maximumFractionDigits: 2,
                                    minimumFractionDigits: 2,
                                  })}
                                </MetricsStatNumber>
                                <MetricsStatUnit>nós (média amostrada)</MetricsStatUnit>
                              </MetricsStatValueRow>
                            </MetricsStat>
                          </MetricsStatGrid>
                        </>
                      )}
                      {r.bellmanMetrics && (
                        <>
                          <MetricsAlgoHint>
                            O algoritmo relaxa todas as arestas várias vezes, pode
                            parar cedo se nada mudar, ou ir até{" "}
                            <abbr title="Número de vértices">V</abbr>−1 passagens
                            completas.
                          </MetricsAlgoHint>
                          <MetricsStatGrid>
                            <MetricsStat
                              title="Relaxações na fase principal que realmente diminuíram alguma distância."
                            >
                              <MetricsStatLabel>Melhorias de distância</MetricsStatLabel>
                              <MetricsStatValueRow>
                                <MetricsStatNumber>
                                  {r.bellmanMetrics.successfulRelaxations.toLocaleString(
                                    "pt-BR"
                                  )}
                                </MetricsStatNumber>
                                <MetricsStatUnit>relaxações úteis (1.ª fase)</MetricsStatUnit>
                              </MetricsStatValueRow>
                            </MetricsStat>
                            <MetricsStat
                              title="Uma passagem = percorrer todas as arestas relaxando uma vez. No máximo V−1 dessas antes da checagem de ciclo."
                            >
                              <MetricsStatLabel>Passagens pelo grafo</MetricsStatLabel>
                              <MetricsStatValueRow>
                                <MetricsStatNumber>
                                  {r.bellmanMetrics.outerIterations.toLocaleString(
                                    "pt-BR"
                                  )}
                                </MetricsStatNumber>
                                <MetricsStatUnit>rodadas (no máx. V−1)</MetricsStatUnit>
                              </MetricsStatValueRow>
                            </MetricsStat>
                            <MetricsStat
                              title="Se numa passagem inteira nenhuma distância mudou, dá para parar antes de chegar em V−1."
                            >
                              <MetricsStatLabel>Parou antes do limite?</MetricsStatLabel>
                              <MetricsStatValueRow>
                                <MetricsStatNumber>
                                  {r.bellmanMetrics.earlyStopped ? "Sim" : "Não"}
                                </MetricsStatNumber>
                                <MetricsStatUnit>
                                  {r.bellmanMetrics.earlyStopped
                                    ? "nada mudou numa rodada inteira"
                                    : "usou todas as rodadas permitidas"}
                                </MetricsStatUnit>
                              </MetricsStatValueRow>
                            </MetricsStat>
                            {r.hasNegativeCycle != null && (
                              <MetricsStat
                                title="Depois das passagens principais, uma volta extra detecta se ainda dá para melhorar distâncias (sinal de ciclo negativo)."
                              >
                                <MetricsStatLabel>Ciclo negativo detectado?</MetricsStatLabel>
                                <MetricsStatValueRow>
                                  <MetricsStatNumber>
                                    {r.hasNegativeCycle ? "Sim" : "Não"}
                                  </MetricsStatNumber>
                                  <MetricsStatUnit>verificação após V−1 passagens</MetricsStatUnit>
                                </MetricsStatValueRow>
                              </MetricsStat>
                            )}
                          </MetricsStatGrid>
                        </>
                      )}
                    </MetricsAlgoCard>
                  );
                })}
              </MetricsAlgoGrid>

              {referenceDistances && (
                <>
                  <TitleContainer>
                    <SubSectionTitle>Distâncias</SubSectionTitle>
                    <p
                      style={{
                        margin: "0px",
                        fontSize: 12,
                        color: "#9a9a9a",
                        lineHeight: 1.45,
                      }}
                    >
                      Distância mínima até cada vértice a partir do nó de origem escolhido
                      acima.
                    </p>
                  </TitleContainer>
                  <DistancesTableContainer>
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
                  </DistancesTableContainer>
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
        </SectionContainer>

        <SectionContainer>
          <h2>Curva de crescimento</h2>
          <BenchmarkParagraph>
            Gera grafos <strong>esparso</strong> aleatórios com |V| ∈ 100, 500, 1k, 5k e
            10k vértices (origem no vértice 0) e mede o tempo médio de cada algoritmo
            selecionado.
          </BenchmarkParagraph>
          <GrowthCurveButton
            type="button"
            onClick={handleGrowthCurve}
            disabled={growthRunning || !anyAlgorithmSelected}
          >
            {growthRunning ? "Calculando curva…" : "Rodar curva de crescimento"}
          </GrowthCurveButton>
          {growthRun && (
            <ChartSection>
              <BenchmarkGrowthChart data={growthRun} />
            </ChartSection>
          )}
        </SectionContainer>

        <EmptySectionContainer></EmptySectionContainer>
      </PageContent>
    </MainContent>
  );
}

export default GraphBenchmark;
